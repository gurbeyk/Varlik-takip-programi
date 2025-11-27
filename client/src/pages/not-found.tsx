import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Sayfa Bulunamadı
            </h1>
            <p className="text-muted-foreground">
              Aradığınız sayfa mevcut değil veya taşınmış olabilir.
            </p>
            <Link href="/">
              <Button className="mt-4" data-testid="button-go-home">
                <Home className="w-4 h-4 mr-2" />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
