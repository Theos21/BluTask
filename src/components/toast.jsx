import { forwardRef, useImperativeHandle, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
} from 'sonner';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'bg-card border-border text-foreground',
  success: 'bg-card border-green-600/50',
  error:   'bg-card border-destructive/50',
  warning: 'bg-card border-amber-600/50',
};

const iconColor = {
  default: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  error:   'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
};

const titleColor = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  error:   'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
};

const actionStyle = {
  default: 'text-foreground border-border/60 hover:bg-muted/30 dark:hover:bg-muted/20',
  success: 'text-green-600 dark:text-green-400 border-green-600/40 dark:border-green-400/30 hover:bg-green-600/10 dark:hover:bg-green-400/10',
  error:   'text-destructive border-destructive/40 hover:bg-destructive/10',
  warning: 'text-amber-600 dark:text-amber-400 border-amber-600/40 dark:border-amber-400/30 hover:bg-amber-600/10 dark:hover:bg-amber-400/10',
};

const variantIcons = {
  default: Info,
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: 50, scale: 0.95 },
};

const Toaster = forwardRef(({ defaultPosition = 'bottom-right' }, ref) => {
  const toastReference = useRef(null);

  useImperativeHandle(ref, () => ({
    show({
      title,
      message,
      variant = 'default',
      duration = 4000,
      position = defaultPosition,
      actions,
      onDismiss,
      highlightTitle,
    }) {
      const Icon = variantIcons[variant];

      toastReference.current = sonnerToast.custom((toastId) => (
        <motion.div
          variants={toastAnimation}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'flex items-center gap-3 min-w-[280px] max-w-sm w-full px-4 py-3 rounded-xl border shadow-md',
            variantStyles[variant]
          )}
        >
          {/* Icon + text */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Icon className={cn('h-4 w-4 flex-shrink-0', iconColor[variant])} />
            <div className="min-w-0">
              {title && (
                <p className={cn(
                  'text-xs font-semibold leading-tight',
                  highlightTitle ? titleColor['success'] : titleColor[variant]
                )}>
                  {title}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-tight truncate">{message}</p>
            </div>
          </div>

          {/* Action + dismiss */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {actions?.label && (
              <>
                <div className="w-px h-4 bg-border flex-shrink-0" />
                <button
                  onClick={() => {
                    actions.onClick();
                    sonnerToast.dismiss(toastId);
                  }}
                  className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap',
                    actionStyle[variant]
                  )}
                >
                  {actions.label}
                </button>
              </>
            )}

            <button
              onClick={() => {
                sonnerToast.dismiss(toastId);
                onDismiss?.();
              }}
              className="rounded-full p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      ), { duration, position });
    },
  }));

  return (
    <SonnerToaster
      position={defaultPosition}
      toastOptions={{ unstyled: true, className: 'flex justify-end' }}
    />
  );
});

export default Toaster;
