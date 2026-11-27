import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';

import PasswordField from '../../src/components/PasswordField';

function renderField(props = {}) {
  return render(<PasswordField value="secret123" onChange={() => {}} {...props} />);
}

describe('PasswordField', () => {
  test('hides the password by default', () => {
    renderField();

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  test('clicking the eye shows the password', async () => {
    renderField();

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  test('clicking the eye again hides the password', async () => {
    renderField();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  test('shows the error message as an alert', () => {
    renderField({ error: 'Password is required' });

    expect(screen.getByRole('alert')).toHaveTextContent('Password is required');
  });
});