import { z } from 'zod';

export const PasswordSchema = z
	.string()
	.min(12)
	.regex(
		/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/,
		'Password must include uppercase, lowercase, a number, and a symbol'
	);

export const RegisterSchema = z.object({
	username: z
		.string()
		.min(3)
		.max(20)
		.regex(
			/^[a-zA-Z0-9_]+$/,
			'Username may only contain letters, numbers, and underscores'
		),
	password: PasswordSchema
});

export const LoginSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1)
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export type LoginInput = z.infer<typeof LoginSchema>;
