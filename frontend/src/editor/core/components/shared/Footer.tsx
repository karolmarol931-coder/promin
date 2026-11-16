import { Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFooterInfo } from "@editor/hooks/useFooterInfo";

interface FooterProps {
  privacyPolicy?: string;
  termsAndConditions?: string;
  accessibilityStatement?: string;
  cookiePolicy?: string;
  impressum?: string;
}

export default function Footer({
  privacyPolicy,
  termsAndConditions,
  accessibilityStatement,
  cookiePolicy,
  impressum,
}: FooterProps) {
  const { t } = useTranslation();
  const { footerInfo } = useFooterInfo();

  // Use props if provided, otherwise fall back to fetched footer info
  const finalPrivacyPolicy = privacyPolicy ?? footerInfo?.privacyPolicy;
  const finalTermsAndConditions =
    termsAndConditions ?? footerInfo?.termsAndConditions;
  const finalAccessibilityStatement =
    accessibilityStatement ?? footerInfo?.accessibilityStatement;
  const finalCookiePolicy = cookiePolicy ?? footerInfo?.cookiePolicy;
  const finalImpressum = impressum ?? footerInfo?.impressum;

  // Default URLs
  const defaultTermsUrl = "https://www.stirling.com/terms";
  const defaultPrivacyUrl = "https://www.stirling.com/privacy";

  // Use provided URLs or fall back to defaults
  const finalTermsUrl = finalTermsAndConditions || defaultTermsUrl;
  const finalPrivacyUrl = finalPrivacyPolicy || defaultPrivacyUrl;

  // Helper to check if a value is valid (not null/undefined/empty string)
  const isValidLink = (link?: string) => link && link.trim().length > 0;

  return (
    <div
      style={{
        height: "var(--footer-height)",
        backgroundColor: "var(--c-surface)",
        borderTop: "1px solid var(--c-border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Flex
        gap="md"
        justify="center"
        align="center"
        direction="row"
        style={{
          fontSize: "0.75rem",
        }}
      >
        <a
          className="footer-link px-3"
          target="_blank"
          rel="noopener noreferrer"
          href={finalPrivacyUrl}
        >
          {t("legal.privacy", "Privacy Policy")}
        </a>
        <a
          className="footer-link px-3"
          target="_blank"
          rel="noopener noreferrer"
          href={finalTermsUrl}
        >
          {t("legal.terms", "Terms and Conditions")}
        </a>
        <a
          className="footer-link px-3"
          target="_blank"
          rel="noopener noreferrer"
          href="https://discord.gg/Cn8pWhQRxZ"
        >
          {t("footer.discord", "Discord")}
        </a>
        <a
          className="footer-link px-3"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/Stirling-Tools/Stirling-PDF"
        >
          {t("footer.issues", "GitHub")}
        </a>
        {isValidLink(finalAccessibilityStatement) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalAccessibilityStatement}
          >
            {t("legal.accessibility", "Accessibility")}
          </a>
        )}
        {isValidLink(finalCookiePolicy) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalCookiePolicy}
          >
            {t("legal.cookie", "Cookie Policy")}
          </a>
        )}
        {isValidLink(finalImpressum) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalImpressum}
          >
            {t("legal.impressum", "Impressum")}
          </a>
        )}
      </Flex>
    </div>
  );
}
