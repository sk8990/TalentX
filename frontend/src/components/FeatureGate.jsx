import ScreenLoader from "./ScreenLoader";
import UpgradeCard from "./UpgradeCard";
import { useSubscription } from "../context/SubscriptionContext";

export default function FeatureGate({
  feature,
  children,
  fallback,
  compact = false,
  loaderMessage = "Checking plan access..."
}) {
  const { loading, subscription, hasFeature } = useSubscription();

  if (loading && !subscription) {
    return (
      <ScreenLoader
        message={loaderMessage}
        subtext="Confirming your TalentX plan."
        className={compact ? "min-h-[8rem]" : "min-h-[18rem]"}
      />
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  return <UpgradeCard feature={feature} compact={compact} />;
}
