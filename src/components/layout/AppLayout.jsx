import { Outlet, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/sidebar'
import AppSidebar from './Sidebar'
import UpdaterBanner from '../UpdaterBanner'

export default function AppLayout() {
  const { pathname } = useLocation()
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117] flex flex-col">
        {/* Mobile top bar — hidden on md+ */}
        <div className="flex md:hidden items-center px-4 h-14 border-b border-gray-100 dark:border-gray-800/60 flex-shrink-0 relative">
          <SidebarTrigger className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          <span className="absolute left-1/2 -translate-x-1/2 text-[17px] tracking-tight leading-none select-none pointer-events-none">
            <span className="font-bold" style={{ color: '#1a56db' }}>Blu</span>
            <span className="font-normal text-gray-700 dark:text-gray-200">Task</span>
          </span>
        </div>
        <div key={pathname} className="flex-1 flex flex-col page-enter min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
      <UpdaterBanner />
    </SidebarProvider>
  )
}
