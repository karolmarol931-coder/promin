import { isAxiosError } from "axios";
import { alert } from "@editor/components/toast";
import { handleHttpError as coreHandleHttpError } from "@editor-core/services/httpErrorHandler";
import i18n from "@editor/i18n";

export async function handleHttpError(error: unknown): Promise<boolean> {
  if (isAxiosError(error) && error.config?.suppressErrorToast === true) {
    return false;
  }

  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401) return true;

  if (status === 403) {
    alert({
      alertType: "error",
      title: i18n.t("auth.accessDenied", "Access Denied"),
      body: i18n.t(
        "auth.insufficientPermissions",
        "You do not have permission to perform this action.",
      ),
      isPersistentPopup: false,
    });
    return true;
  }

  return coreHandleHttpError(error);
}
