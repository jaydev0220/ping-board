import { z } from 'zod';

const ServiceNameSchema = z.string().trim().min(1).max(120);
const ServiceDescriptionInputSchema = z.string().trim().min(1).max(500);
const BinaryIntSchema = z.union([z.literal(0), z.literal(1)]);

export const ServiceIdParamsSchema = z.object({
	id: z.coerce.number().int().positive()
});

export const CreateServiceSchema = z
	.object({
		name: ServiceNameSchema,
		url: z.url().max(2048),
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
		message: 'At least one field must be provided'
	});

export const ServiceResponseSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	url: z.string(),
	description: z.string().nullable(),
	is_active: BinaryIntSchema,
	created_at: z.number().int().nonnegative(),
	created_by: z.number().int().positive()
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

export type StatusItemResponse = z.infer<typeof StatusItemResponseSchema>;
