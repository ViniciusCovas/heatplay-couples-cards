import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/animated-logo";
import { logger } from "@/utils/logger";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div className="min-h-screen romantic-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex items-center justify-center">
          <Logo size="medium" />
        </div>

        <p className="font-display text-6xl font-bold text-primary-ink" aria-hidden="true">
          404
        </p>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t('notFound.title', 'This page went off script')}
          </h1>
          <p className="text-muted-foreground">
            {t('notFound.description', "We couldn't find the page you were looking for. Let's get you back to something closer.")}
          </p>
        </div>

        <Button asChild className="btn-gradient-primary h-12 px-8 text-base font-semibold">
          <Link to="/">{t('notFound.backHome', 'Back to Home')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
