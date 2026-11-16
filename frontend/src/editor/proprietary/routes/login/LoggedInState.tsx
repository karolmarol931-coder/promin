import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingFallback } from "@editor/components/shared/LoadingFallback";
import { EDITOR_BASENAME } from "@editor/routes/editorBasename";

export default function LoggedInState() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(EDITOR_BASENAME, { replace: true });
  }, [navigate]);

  return <LoadingFallback />;
}
