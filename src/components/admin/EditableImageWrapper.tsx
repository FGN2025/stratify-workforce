import { useState, type ReactNode } from 'react';
import { Camera } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

interface EditableImageWrapperProps {
  children: ReactNode;
  onEdit: () => void;
  className?: string;
  /** Position of the edit button */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

/**
 * A wrapper component that adds an admin-only edit overlay to any image element.
 * Shows a camera icon on hover that opens the media picker when clicked.
 */
export function EditableImageWrapper({
  children,
  onEdit,
  className,
  position = 'top-right',
}: EditableImageWrapperProps) {
  const { isAdmin, isSuperAdmin, isLoading } = useUserRole();
  const [isHovered, setIsHovered] = useState(false);

  const canEdit = isAdmin || isSuperAdmin;

  // Don't show edit controls while loading or if user can't edit
  if (isLoading || !canEdit) {
    return <>{children}</>;
  }

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  };

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Edit overlay - only visible on hover */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200 pointer-events-none',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Edit button */}
      <button
        onClick={handleEditClick}
        className={cn(
          'absolute z-10 p-2 rounded-full',
          'bg-background/80 backdrop-blur-sm border border-border',
          'text-foreground hover:bg-primary hover:text-primary-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          positionClasses[position],
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        )}
        title="Edit image"
        type="button"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  );
}
