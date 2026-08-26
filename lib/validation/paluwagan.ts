import { z } from 'zod';

export const paluwaganSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Paluwagan name is required.')
    .max(80, 'Paluwagan name must be shorter than 80 characters.'),
  description: z.string().trim().max(250, 'Description must be 250 characters or less.').optional().or(z.literal('')),
  contribution_amount: z
    .string()
    .trim()
    .refine((value) => value !== '' && Number(value) > 0, 'Contribution amount must be greater than zero.'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  start_date: z.string().refine((value) => !!value && !Number.isNaN(new Date(value).getTime()), 'Choose a valid start date.'),
});

export type PaluwaganFormValues = z.infer<typeof paluwaganSchema>;
