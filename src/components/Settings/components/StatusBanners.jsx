import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

/**
 * reusable pair of error / success status banners
 * both are optional and/or only rendered when the strings are not empty
 */
const StatusBanners = ({ errorMsg, successMsg, style }) => (
  <div style={style}>
    {errorMsg && (
      <div className="settings-status-banner error" style={{ marginTop: '8px' }}>
        <AlertCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        {errorMsg}
      </div>
    )}
    {successMsg && (
      <div className="settings-status-banner success" style={{ marginTop: '8px' }}>
        <Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        {successMsg}
      </div>
    )}
  </div>
);

export default StatusBanners;
