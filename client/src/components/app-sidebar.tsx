import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  FileBarChart, 
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Portföyüm",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Varlıklarım",
    url: "/varliklar",
    icon: Wallet,
  },
  {
    title: "İşlemler",
    url: "/islemler",
    icon: ArrowLeftRight,
  },
  {
    title: "Raporlar",
    url: "/raporlar",
    icon: FileBarChart,
  },
  {
    title: "Ayarlar",
    url: "/ayarlar",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer" data-testid="link-logo">
            <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">PortföyTakip</h1>
              <p className="text-xs text-muted-foreground">Yatırım Platformu</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider px-4 py-2">
            Menü
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <Link href={item.url} data-testid={`link-${item.url.replace('/', '') || 'dashboard'}`}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <a href="/api/logout" className="w-full">
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-logout-sidebar">
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </Button>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
