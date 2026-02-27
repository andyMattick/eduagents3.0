import React, { useEffect, useState } from 'react';
import { ResourceLimitStatus, SUBSCRIPTION_TIERS } from '../types/teacherSystem';
import './ApiUsageBanner.css';

interface ApiUsageBannerProps {
  limits: ResourceLimitStatus | null;
  isLoading?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  collapsed?: boolean;
}

type BannerState = 'normal' | 'warning' | 'critical' | 'disabled' | 'unlimited';

export const ApiUsageBanner: React.FC<ApiUsageBannerProps> = ({
  limits,
  isLoading = false,
  onUpgrade,
  onDismiss,
  collapsed: initialCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [bannerState, setBannerState] = useState<BannerState>('normal');
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    if (!limits) return;

    // Determine banner state
    if (!limits.apiCallLimit.canCall) {
      setBannerState('disabled');
    } else if (limits.apiCallLimit.percentageUsed >= 90) {
      setBannerState('critical');
    } else if (limits.apiCallLimit.percentageUsed >= 70) {
      setBannerState('warning');
    } else {
      setBannerState('normal');
    }

    // Show banner if in warning, critical, or disabled state
    if (['warning', 'critical', 'disabled'].includes(bannerState)) {
      setShouldShow(true);
    }
  }, [limits, bannerState]);

  if (!limits || !shouldShow || isLoading) {
    return null;
  }

  const { apiCallLimit } = limits;
  const tierConfig = SUBSCRIPTION_TIERS[limits.tier];
  const percentageUsed = Math.round(apiCallLimit.percentageUsed);

  const getBannerContent = () => {
    switch (bannerState) {
      case 'disabled':
        return {
          icon: '🚫',
          title: 'API Quota Exhausted',
          message: `You've reached your monthly limit of ${tierConfig.monthlyApiLimit} API calls. AI features are temporarily disabled.`,
          action: 'Upgrade Now',
          severity: 'error',
        };

      case 'critical':
        return {
          icon: '⚠️',
          title: 'API Quota Warning',
          message: `You've used ${percentageUsed}% of your ${tierConfig.monthlyApiLimit} monthly API calls. Upgrade to avoid running out.`,
          action: 'Upgrade Plan',
          severity: 'error',
        };

      case 'warning':
        return {
          icon: '⚡',
          title: 'API Usage High',
          message: `You've used ${percentageUsed}% of your monthly API quota. Consider upgrading for more capacity.`,
          action: 'View Plans',
          severity: 'warning',
        };

      default:
        return {
          icon: '✅',
          title: 'API Usage Normal',
          message: `Using ${percentageUsed}% of your monthly quota. You have ${apiCallLimit.max - apiCallLimit.current} calls remaining.`,
          action: null,
          severity: 'info',
        };
    }
  };

  const content = getBannerContent();

  if (collapsed) {
    return (
      <div className={`api-usage-banner api-usage-banner--collapsed api-usage-banner--${content.severity}`}>
        <div className="banner-collapsed-content" onClick={() => setCollapsed(false)}>
          <span className="banner-icon">{content.icon}</span>
          <span className="banner-summary">
            {percentageUsed}% of {tierConfig.monthlyApiLimit} calls used
          </span>
          <button className="banner-expand-btn" onClick={() => setCollapsed(false)}>
            ▲
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`api-usage-banner api-usage-banner--${content.severity}`}>
      <div className="banner-content">
        <div className="banner-message">
          <span className="banner-icon">{content.icon}</span>
          <div className="banner-text">
            <h3 className="banner-title">{content.title}</h3>
            <p className="banner-description">{content.message}</p>
          </div>
        </div>

        <div className="banner-metric">
          <div className="metric-bar-container">
            <div className="metric-bar">
              <div
                className={`metric-fill metric-fill--${content.severity}`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
            <div className="metric-label">
              <span className="metric-used">{apiCallLimit.current}</span>
              <span className="metric-separator">/</span>
              <span className="metric-total">{apiCallLimit.max}</span>
            </div>
          </div>
          {bannerState !== 'disabled' && (
            <div className="metric-remaining">
              {apiCallLimit.max - apiCallLimit.current} calls remaining
            </div>
          )}
        </div>
      </div>

      <div className="banner-actions">
        {content.action && (
          <button
            onClick={onUpgrade}
            className={`banner-btn banner-btn--action banner-btn--${content.severity}`}
          >
            {content.action}
          </button>
        )}
        <button onClick={() => setCollapsed(true)} className="banner-btn banner-btn--collapse">
          ▼
        </button>
        {onDismiss && (
          <button onClick={() => { setShouldShow(false); onDismiss?.(); }} className="banner-btn banner-btn--close">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Compact inline usage indicator
 * Use this when you don't want the full banner
 */
export const ApiUsageIndicator: React.FC<{
  limits: ResourceLimitStatus | null;
  compact?: boolean;
}> = ({ limits, compact = false }) => {
  if (!limits) return null;

  const { apiCallLimit } = limits;
  const tierConfig = SUBSCRIPTION_TIERS[limits.tier];
  const percentageUsed = Math.round(apiCallLimit.percentageUsed);

  let statusColor = '#4CAF50'; // green
  let statusLabel = 'Good';

  if (!apiCallLimit.canCall) {
    statusColor = '#f44336'; // red
    statusLabel = 'Exhausted';
  } else if (percentageUsed >= 90) {
    statusColor = '#f44336'; // red
    statusLabel = 'Critical';
  } else if (percentageUsed >= 70) {
    statusColor = '#ff9800'; // orange
    statusLabel = 'Warning';
  }

  if (compact) {
    return (
      <div className="api-usage-indicator api-usage-indicator--compact">
        <div className="indicator-dot" style={{ backgroundColor: statusColor }} />
        <span className="indicator-text">{statusLabel}</span>
      </div>
    );
  }

  return (
    <div className="api-usage-indicator">
      <div className="indicator-header">
        <span className="indicator-label">API Usage</span>
        <span className="indicator-percentage">{percentageUsed}%</span>
      </div>
      <div className="indicator-bar">
        <div className="indicator-fill" style={{ width: `${percentageUsed}%`, backgroundColor: statusColor }} />
      </div>
      <div className="indicator-detail">
        <span>{apiCallLimit.current} of {apiCallLimit.max} calls used</span>
        <span className="indicator-status" style={{ color: statusColor }}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
};

export default ApiUsageBanner;
