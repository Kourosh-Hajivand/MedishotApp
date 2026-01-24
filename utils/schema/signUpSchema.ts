import { z } from "zod";

export const signUpSchema = z.object({
    email: z.string().min(1, "Email is required").email("Please enter a valid email"),
    password: z
        .string()
        .min(1, "Password is required")
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
