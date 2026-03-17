import React from 'react';
import { ExpenseProvider } from '@/contexts/ExpenseContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { BlocksProvider } from '@/contexts/BlocksContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { ScanHistoryProvider } from '@/contexts/ScanHistoryContext';
import { SavedItemsProvider } from '@/contexts/SavedItemsContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
        <ExpenseProvider>
          <ProfileProvider>
            <BlocksProvider>
              <BusinessProvider>
                <PremiumProvider>
                  <ScanHistoryProvider>
                    <SavedItemsProvider>
                      {children}
                    </SavedItemsProvider>
                  </ScanHistoryProvider>
                </PremiumProvider>
              </BusinessProvider>
            </BlocksProvider>
          </ProfileProvider>
        </ExpenseProvider>
    </AuthProvider>
  );
}
