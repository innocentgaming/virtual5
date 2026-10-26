import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';
import { Workspace } from '../Workspace';

export function renderWorkspace(mode: 'account' | 'demo' = 'demo'): RenderResult {
  return render(
    <AuthProvider>
      <Workspace mode={mode} />
    </AuthProvider>
  );
}
