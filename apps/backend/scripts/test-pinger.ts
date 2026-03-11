import { createPingerHttpClient } from '../src/pinger/pinger.ts';

const timeoutMs = 5_000;
const demoTargets = [
	{
		label: 'GitHub',
		url: 'https://github.com'
	},
	{
		label: 'Google',
		url: 'https://www.google.com'
	},
	{
		label: '測試伺服器',
		url: 'http://localhost:3000'
	}
] as const;
const formatTimestamp = (date: Date) => date.toISOString();
const formatStatusCode = (statusCode: number | null) =>
	statusCode === null ? 'not available' : String(statusCode);

const logDivider = () => {
	console.log('------------------------------------------------------------');
};

const delay = (ms: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
};

const runDemo = async () => {
	const client = createPingerHttpClient({ timeoutMs });

	console.log(`[${formatTimestamp(new Date())}] 開始檢測工具測試。`);
	logDivider();

	while (true) {
		for (const target of demoTargets) {
			console.log(`[${formatTimestamp(new Date())}] 正在檢測 ${target.label}`);
			console.log(`  網址: ${target.url}`);

			const result = await client.ping(target.url);

			console.log(`  結果: ${result.isUp ? '連線正常' : '無法連線'}`);
			console.log(`  檢測時間: ${formatTimestamp(result.checkedAt)}`);
			console.log(`  HTTP 狀態碼: ${formatStatusCode(result.statusCode)}`);
			console.log(`  延遲: ${result.latencyMs}ms`);

			if (result.error) {
				console.log(`  錯誤代碼: ${result.error.code}`);
				console.log(`  錯誤訊息: ${result.error.message}`);

				if (result.error.cause) {
					console.log(`  錯誤原因: ${result.error.cause}`);
				}
			}

			logDivider();
		}

		await delay(5000);
	}
};

try {
	await runDemo();
} catch {
	process.exit(1);
}
