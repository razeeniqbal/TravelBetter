import { fireEvent, screen } from '@testing-library/react';

export function tapMockMarker() {
  fireEvent.click(screen.getByRole('button', { name: /^mock marker tap$/i }));
}

export function dragSheetToExpanded() {
  fireEvent.click(screen.getByRole('button', { name: /mock drag sheet to expanded/i }));
}

export function dragSheetToPreview() {
  fireEvent.click(screen.getByRole('button', { name: /mock drag sheet to preview/i }));
}
