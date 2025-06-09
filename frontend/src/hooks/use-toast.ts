import { toast } from 'sonner';

// This is just a wrapper around sonner's toast to keep the API consistent
export const useToast = () => {
  return {
    toast,
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    warning: (message: string) => toast.warning(message),
    info: (message: string) => toast.info(message),
  };
};