import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const safeFormatDate = (date: any, formatStr: string = 'dd/MM/yyyy') => {
  if (!date) return '---';
  const d = new Date(date);
  if (!isValid(d)) return 'Data inválida';
  return format(d, formatStr);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const CATEGORIES = {
  income: ['Salário', 'Investimentos', 'Freelance', 'Presente', 'Outros'],
  expense: ['Aluguel', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Assinaturas', 'Outros'],
};
