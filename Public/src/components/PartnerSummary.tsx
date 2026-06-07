import React from 'react';
import { PartnerBreakdown } from '@/types';

interface PartnerSummaryProps {
  breakdown: Record<number, PartnerBreakdown>;
  currency?: string;
}

export function PartnerSummary({ breakdown, currency = '€' }: PartnerSummaryProps) {
  if (Object.keys(breakdown).length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Summary</h2>
        <p className="text-gray-500 text-center py-4">No partner data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Summary</h2>
      
      <div className="space-y-4">
        {Object.entries(breakdown).map(([partnerId, data]) => (
          <div key={partnerId} className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">{data.name}</h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Income</div>
                <div className="font-medium text-gray-900">
                  {currency}{data.income.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Bank Contribution</div>
                <div className="font-medium text-gray-900">
                  {currency}{data.bankContribution.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Savings Contribution</div>
                <div className="font-medium text-gray-900">
                  {currency}{data.savingsContribution.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Personal Allowance</div>
                <div className="font-medium text-gray-900">
                  {currency}{data.personalAllowance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
