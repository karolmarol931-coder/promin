import React from "react";
import { useTranslation } from "react-i18next";
import { RemoveCertificateSignParameters } from "@editor/hooks/tools/removeCertificateSign/useRemoveCertificateSignParameters";

interface RemoveCertificateSignSettingsProps {
  parameters: RemoveCertificateSignParameters;
  onParameterChange: <K extends keyof RemoveCertificateSignParameters>(
    parameter: K,
    value: RemoveCertificateSignParameters[K],
  ) => void;
  disabled?: boolean;
}

const RemoveCertificateSignSettings: React.FC<
  RemoveCertificateSignSettingsProps
> = (_) => {
  const { t } = useTranslation();

  return (
    <div className="remove-certificate-sign-settings">
      <p className="text-muted">
        {t(
          "removeCertSign.description",
          "Removes the digital signature. Its visible mark may remain on the page, but it is no longer a valid signature.",
        )}
      </p>
    </div>
  );
};

export default RemoveCertificateSignSettings;
