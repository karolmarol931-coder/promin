import { SidebarBrand } from "@editor/components/shared/SidebarBrand";

export interface SidebarHeaderProps {
  className?: string;
}

export function SidebarHeader({ className }: SidebarHeaderProps) {
  return (
    <div className={`file-sidebar-header${className ? ` ${className}` : ""}`}>
      <SidebarBrand />
    </div>
  );
}
