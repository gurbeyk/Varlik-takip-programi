import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, LogOut, Shield } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Kullanıcı";

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          Ayarlar
        </h1>
        <p className="text-muted-foreground">
          Hesap ayarlarınızı yönetin
        </p>
      </div>

      {/* Profile Section */}
      <Card data-testid="card-profile">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Profil Bilgileri
          </CardTitle>
          <CardDescription>
            Hesabınızla ilgili temel bilgiler
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage
                src={user?.profileImageUrl || undefined}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold" data-testid="text-display-name">
                {displayName}
              </p>
              {user?.email && (
                <p className="text-muted-foreground flex items-center gap-1" data-testid="text-email">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card data-testid="card-security">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Güvenlik
          </CardTitle>
          <CardDescription>
            Hesap güvenliği ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Oturum Yönetimi</p>
              <p className="text-sm text-muted-foreground">
                Mevcut oturumunuzu sonlandırabilirsiniz
              </p>
            </div>
            <a href="/api/logout">
              <Button variant="outline" className="gap-2" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uygulama Hakkında</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Versiyon</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Platform</p>
              <p className="font-medium">PortföyTakip</p>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Yatırımlarınızı takip etmek ve portföyünüzü yönetmek için profesyonel bir platform.
            Hisse senetleri, ETF'ler, kripto paralar ve gayrimenkul varlıklarınızı kolayca izleyin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
