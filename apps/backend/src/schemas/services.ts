import { z } from 'zod';

const ServiceNameSchema = z
	.string('請輸入服務名稱')
	.trim()
	.min(1, '請輸入服務名稱')
	.max(120, '服務名稱最多為 120 個字元');
const ServiceDescriptionInputSchema = z
	.string('服務說明必須為文字')
	.trim()
	.min(1, '服務說明不可為空')
	.max(500, '服務說明最多為 500 個字元');
const BinaryIntSchema = z.union([z.literal(0), z.literal(1)]);

export const ServiceIdParamsSchema = z.object({
	id: z.coerce
		.number('服務 ID 必須為數字')
		.int('服務 ID 必須為整數')
		.positive('服務 ID 必須為正整數')
});

export const CreateServiceSchema = z
	.object({
		name: ServiceNameSchema,
		url: z.url('請輸入有效的服務網址').max(2048, '服務網址最多為 2048 個字元'),
		description: ServiceDescriptionInputSchema.optional()
	})
	.strict();

export const UpdateServiceSchema = z
	.object({
		name: ServiceNameSchema.optional(),
		description: ServiceDescriptionInputSchema.optional()
	})
	.strict()
	.refine((data) => data.name !== undefined || data.description !== undefined, {
		message: '至少需提供一個可更新欄位'
	});

export const ServiceResponseSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	url: z.string(),
	description: z.string().nullable(),
	is_active: BinaryIntSchema,
	created_at: z.number().int().nonnegative(),
	first_created_by: z.number().int().positive().nullable()
});

export const ServicesResponseSchema = z.object({
	services: z.array(ServiceResponseSchema),
	service_quota: z.number().int().nonnegative()
});

export const StatusItemResponseSchema = z.object({
	is_up: BinaryIntSchema,
	status_code: z.number().int().nullable(),
	latency_ms: z.number().int().nullable(),
	checked_at: z.number().int().nonnegative()
});

export type ServiceIdParams = z.infer<typeof ServiceIdParamsSchema>;

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

export type ServiceResponse = z.infer<typeof ServiceResponseSchema>;

export type ServicesResponse = z.infer<typeof ServicesResponseSchema>;

export type StatusItemResponse = z.infer<typeof StatusItemResponseSchema>;
