import { z } from 'zod';

export const PasswordSchema = z
	.string()
	.min(12, '密碼至少需為 12 個字元')
	.regex(
		/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/,
		'密碼需包含大寫字母、小寫字母、數字與符號'
	);

export const RegisterSchema = z.object({
	username: z
		.string()
		.min(3, '使用者名稱至少需為 3 個字元')
		.max(20, '使用者名稱最多為 20 個字元')
		.regex(/^[a-zA-Z0-9_]+$/, '使用者名稱僅能包含英文字母、數字與底線'),
	password: PasswordSchema
});

export const LoginSchema = z.object({
	username: z.string().min(1, '請輸入使用者名稱'),
	password: z.string().min(1, '請輸入密碼')
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export type LoginInput = z.infer<typeof LoginSchema>;
