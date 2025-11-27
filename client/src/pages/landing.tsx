import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  Shield, 
  Wallet,
  ArrowRight,
  Building2,
  Bitcoin,
  LineChart
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">PortföyTakip</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">
              Giriş Yap
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Yatırımlarınızı Akıllıca Yönetin
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Hisse senetleri, ETF'ler, kripto paralar ve gayrimenkul varlıklarınızı 
            tek bir platformda takip edin. Performansınızı analiz edin, 
            bilinçli kararlar alın.
          </p>
          <a href="/api/login">
            <Button size="lg" className="text-lg px-8" data-testid="button-hero-login">
              Ücretsiz Başla
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-card">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Tüm Varlıklarınız Bir Arada
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Hisse Senetleri</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Borsadaki tüm hisse senetlerinizi takip edin ve performanslarını izleyin.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <PieChart className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">ETF'ler</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Borsa yatırım fonlarınızı yönetin ve çeşitlendirilmiş portföyünüzü izleyin.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Bitcoin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Kripto Paralar</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Bitcoin, Ethereum ve diğer kripto varlıklarınızı güvenle takip edin.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Gayrimenkul</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Ev, arsa ve ticari gayrimenkul yatırımlarınızı tek yerden yönetin.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-lg">Detaylı Raporlar</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Aylık ve yıllık performans raporları ile yatırımlarınızı analiz edin.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LineChart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">Varlık Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Portföyünüzün varlık dağılımını görsel grafiklerle takip edin.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-lg">Güvenli Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Verileriniz güvenle saklanır ve sadece size özel olarak görüntülenir.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Yatırımlarınızı Kontrol Altına Alın
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Hemen ücretsiz hesap oluşturun ve finansal hedeflerinize doğru ilk adımı atın.
          </p>
          <a href="/api/login">
            <Button size="lg" variant="secondary" className="text-lg px-8" data-testid="button-cta-login">
              Hemen Başla
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-card">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 PortföyTakip. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
