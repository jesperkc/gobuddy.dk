import { Link } from "@tanstack/react-router";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";

export const Breadcrumbs = ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <BreadcrumbItem key={index}>
            {crumb.href ? (
              <>
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
                {index < crumbs.length - 1 && <BreadcrumbSeparator />}
              </>
            ) : (
              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
