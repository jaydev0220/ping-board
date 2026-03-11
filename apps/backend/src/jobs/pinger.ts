import cron from 'node-cron';
import db from '../db/client.js';
import {
	createPingerHttpClient,
	type PingerHttpClient
} from '../pinger/pinger.js';

const SERVICE_CHECK_SCHEDULE = '*/5 * * * *';
const PING_LOG_PRUNE_SCHEDULE = '0 0 * * *';
const PING_LOG_RETENTION_DAYS = 92;
const SECONDS_PER_DAY = 24 * 60 * 60;

type ActiveService = {
	id: number;
	name: string;
	url: string;
};

type Logger = Pick<Console, 'info' | 'warn' | 'error'>;

type RunServiceChecksOptions = {
	database?: typeof db;
	logger?: Logger;
	pingerClient: PingerHttpClient;
};

type PrunePingLogsOptions = {
	database?: typeof db;
	logger?: Logger;
};

export type StartPingerJobsOptions = {
	timeoutMs: number;
	database?: typeof db;
	logger?: Logger;
	serviceCheckSchedule?: string;
	pruneSchedule?: string;
};

export type PingerJobs = {
	stop: () => void;
};

const getLogger = (logger?: Logger): Logger => logger ?? console;

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	return 'Unknown error';
};

const getUnixSeconds = (date: Date): number =>
	Math.floor(date.getTime() / 1000);
const getPruneCutoffUnixSeconds = (): number =>
	Math.floor(Date.now() / 1000) - PING_LOG_RETENTION_DAYS * SECONDS_PER_DAY;
const formatServiceLabel = (service: ActiveService): string =>
	`${service.name} (#${service.id})`;

const assertCronExpression = (expression: string, label: string): void => {
	if (!cron.validate(expression)) {
		throw new TypeError(`Invalid ${label} cron expression: "${expression}".`);
	}
};

const loadActiveServices = (database: typeof db): ActiveService[] =>
	database
		.prepare<[number], ActiveService>(
			`
				SELECT id, name, url
				FROM services
				WHERE is_active = ?
				ORDER BY id ASC
			`
		)
		.all(1);
const createInsertPingLogStatement = (database: typeof db) =>
	database.prepare<
		[
			serviceId: number,
			isUp: number,
			statusCode: number | null,
			latencyMs: number | null,
			checkedAt: number
		]
	>(
		`
			INSERT INTO ping_logs (
				service_id,
				is_up,
				status_code,
				latency_ms,
				checked_at
			)
			VALUES (?, ?, ?, ?, ?)
		`
	);
const createPrunePingLogsStatement = (database: typeof db) =>
	database.prepare<[checkedAtCutoff: number]>(
		`
			DELETE FROM ping_logs
			WHERE checked_at < ?
		`
	);

export const runServiceChecks = async ({
	database = db,
	logger,
	pingerClient
}: RunServiceChecksOptions): Promise<void> => {
	const log = getLogger(logger);
	const services = loadActiveServices(database);

	if (services.length === 0) {
		log.info('[pinger] No active services to check.');
		return;
	}

	const insertPingLog = createInsertPingLogStatement(database);
	const settledResults = await Promise.allSettled(
		services.map(async (service) => ({
			service,
			result: await pingerClient.ping(service.url)
		}))
	);
	let upCount = 0;
	let downCount = 0;

	for (const settledResult of settledResults) {
		if (settledResult.status === 'rejected') {
			log.error(
				`[pinger] Service check failed unexpectedly: ${getErrorMessage(
					settledResult.reason
				)}`
			);
			continue;
		}

		const { service, result } = settledResult.value;
		const isUp = result.isUp ? 1 : 0;
		const latencyMs = result.isUp ? result.latencyMs : null;

		try {
			insertPingLog.run(
				service.id,
				isUp,
				result.statusCode,
				latencyMs,
				getUnixSeconds(result.checkedAt)
			);
		} catch (error) {
			log.error(
				`[pinger] Failed to store ping log for ${formatServiceLabel(service)}: ${getErrorMessage(
					error
				)}`
			);
			continue;
		}

		if (result.isUp) {
			upCount += 1;
			continue;
		}

		downCount += 1;

		const failureReason = result.error?.message ?? 'Request failed.';

		log.warn(
			`[pinger] ${formatServiceLabel(service)} is down (${failureReason})`
		);
	}

	log.info(
		`[pinger] Checked ${services.length} active services (${upCount} up, ${downCount} down).`
	);
};

export const prunePingLogs = ({
	database = db,
	logger
}: PrunePingLogsOptions = {}): void => {
	const log = getLogger(logger);
	const prunePingLogs = createPrunePingLogsStatement(database);
	const result = prunePingLogs.run(getPruneCutoffUnixSeconds());

	log.info(
		`[pinger] Pruned ${result.changes} ping logs older than ${PING_LOG_RETENTION_DAYS} days.`
	);
};

export const startPingerJobs = ({
	timeoutMs,
	database = db,
	logger,
	serviceCheckSchedule = SERVICE_CHECK_SCHEDULE,
	pruneSchedule = PING_LOG_PRUNE_SCHEDULE
}: StartPingerJobsOptions): PingerJobs => {
	const log = getLogger(logger);

	assertCronExpression(serviceCheckSchedule, 'service check');
	assertCronExpression(pruneSchedule, 'prune');

	const pingerClient = createPingerHttpClient({ timeoutMs });
	let isCheckingServices = false;
	let isPruningLogs = false;
	const serviceCheckTask = cron.schedule(serviceCheckSchedule, () => {
		if (isCheckingServices) {
			log.warn(
				'[pinger] Skipping service check; previous run is still active.'
			);
			return;
		}

		isCheckingServices = true;
		void runServiceChecks({ database, logger: log, pingerClient })
			.catch((error: unknown) => {
				log.error(
					`[pinger] Service check run failed: ${getErrorMessage(error)}`
				);
			})
			.finally(() => {
				isCheckingServices = false;
			});
	});
	const pruneTask = cron.schedule(pruneSchedule, () => {
		if (isPruningLogs) {
			log.warn('[pinger] Skipping prune; previous run is still active.');
			return;
		}

		isPruningLogs = true;

		try {
			prunePingLogs({ database, logger: log });
		} catch (error) {
			log.error(`[pinger] Prune run failed: ${getErrorMessage(error)}`);
		} finally {
			isPruningLogs = false;
		}
	});

	log.info(
		`[pinger] Scheduled service checks (${serviceCheckSchedule}) and daily pruning (${pruneSchedule}).`
	);
	return {
		stop: () => {
			serviceCheckTask.stop();
			pruneTask.stop();
			log.info('[pinger] Stopped scheduled pinger jobs.');
		}
	};
};
