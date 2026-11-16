import React from "react";
import { Anchor, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Icon } from "@editor/ui/Icon";
import { useAppConfig } from "@editor/contexts/AppConfigContext";
import { useFooterInfo } from "@editor/hooks/useFooterInfo";

interface LegalLink {
  key: string;
  label: string;
  href: string;
}

const LegalSection: React.FC = () => {
  const { t } = useTranslation();
  const { config } = useAppConfig();
  const { footerInfo } = useFooterInfo();

  const privacyPolicy = config?.privacyPolicy ?? footerInfo?.privacyPolicy;
  const termsAndConditions =
    config?.termsAndConditions ?? footerInfo?.termsAndConditions;
  const accessibilityStatement =
    config?.accessibilityStatement ?? footerInfo?.accessibilityStatement;
  const cookiePolicy = config?.cookiePolicy ?? footerInfo?.cookiePolicy;
  const impressum = config?.impressum ?? footerInfo?.impressum;

  const isAvailableLink = (link?: string) => {
    if (!link?.trim()) return false;
    const normalizedLink = link.trim().replace(/^https?:\/\//i, "");
    return !/^(?:[a-z0-9-]+\.)*stirling(?:pdf)?\.(?:com|io)(?:\/|$)/i.test(
      normalizedLink,
    );
  };

  const legalLinks: LegalLink[] = [
    {
      key: "privacy",
      label: t("legal.privacy", "Privacy Policy"),
      href: privacyPolicy ?? "",
    },
    {
      key: "terms",
      label: t("legal.terms", "Terms and Conditions"),
      href: termsAndConditions ?? "",
    },
    ...(isAvailableLink(accessibilityStatement)
      ? [
          {
            key: "accessibility",
            label: t("legal.accessibility", "Accessibility"),
            href: accessibilityStatement!,
          },
        ]
      : []),
    ...(isAvailableLink(cookiePolicy)
      ? [
          {
            key: "cookie",
            label: t("legal.cookie", "Cookie Policy"),
            href: cookiePolicy!,
          },
        ]
      : []),
    ...(isAvailableLink(impressum)
      ? [
          {
            key: "impressum",
            label: t("legal.impressum", "Impressum"),
            href: impressum!,
          },
        ]
      : []),
  ];

  const availableLegalLinks = legalLinks.filter((link) =>
    isAvailableLink(link.href),
  );

  const renderLink = (link: LegalLink) => (
    <Anchor
      key={link.key}
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
    >
      <Group gap={6} wrap="nowrap">
        {link.label}
        <Icon name="external-link" size="0.9rem" />
      </Group>
    </Anchor>
  );

  return (
    <Stack gap="lg">
      {availableLegalLinks.length > 0 ? (
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm">
                {t("settings.legal.documents.title", "Legal Documents")}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {t(
                  "settings.legal.documents.description",
                  "Policies and legal information for this service.",
                )}
              </Text>
            </div>
            <Stack gap="sm">{availableLegalLinks.map(renderLink)}</Stack>
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            {t(
              "settings.legal.documents.localNotice",
              "No external legal documents are configured for this local installation.",
            )}
          </Text>
        </Paper>
      )}
    </Stack>
  );
};

export default LegalSection;
