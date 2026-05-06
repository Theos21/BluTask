import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/sidebar'
import AppSidebar from './Sidebar'

export default function AppLayout() {
  const { pathname } = useLocation()
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
        <div key={pathname} className="h-full flex flex-col page-enter">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
