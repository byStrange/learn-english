import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PinPad, type PinResult} from './PinPad';

function setup(result: PinResult = {ok: true, token: 't', userId: 'said-ali', role: 'learner', trackId: 'g2', expiresAt: ''}) {
  const onSubmit = vi.fn(async () => result);
  render(<PinPad length={4} label="PIN for Said Ali" onSubmit={onSubmit} />);
  return onSubmit;
}

describe('PinPad', () => {
  it('draws its own number keys: no text field, so no phone keyboard', () => {
    setup();
    expect(document.querySelector('input, textarea')).toBeNull();
    for (const d of '0123456789') expect(screen.getByRole('button', {name: d})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Delete last digit'})).toBeInTheDocument();
  });

  it('checks the PIN by itself after 4 taps', async () => {
    const onSubmit = setup();
    for (const d of ['4', '8', '2', '1']) await userEvent.click(screen.getByRole('button', {name: d}));
    expect(onSubmit).toHaveBeenCalledWith('4821');
  });

  it('Delete removes the last digit', async () => {
    const onSubmit = setup();
    await userEvent.click(screen.getByRole('button', {name: '1'}));
    await userEvent.click(screen.getByRole('button', {name: '2'}));
    expect(screen.getByRole('img', {name: '2 of 4 digits entered'})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Delete last digit'}));
    expect(screen.getByRole('img', {name: '1 of 4 digits entered'})).toBeInTheDocument();
    for (const d of ['3', '4', '5']) await userEvent.click(screen.getByRole('button', {name: d}));
    expect(onSubmit).toHaveBeenCalledWith('1345');
  });

  it('works with a computer keyboard too (digits and Backspace)', async () => {
    const onSubmit = setup();
    const pad = screen.getByRole('group', {name: 'PIN for Said Ali'});
    for (const key of ['9', '9', 'Backspace', '1', '2', '3']) fireEvent.keyDown(pad, {key});
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('9123'));
  });

  it('says how many tries are left after a wrong PIN', async () => {
    setup({ok: false, reason: 'wrong_pin', triesLeft: 3});
    for (const d of ['1', '1', '1', '1']) await userEvent.click(screen.getByRole('button', {name: d}));
    expect(await screen.findByText("That PIN isn't right. 3 tries left.")).toBeInTheDocument();
  });

  it('stops taking digits when locked', async () => {
    const onSubmit = setup({ok: false, reason: 'locked', retryAfterS: 600});
    for (const d of ['1', '1', '1', '1']) await userEvent.click(screen.getByRole('button', {name: d}));
    expect(await screen.findByText(/Too many tries. Wait 10 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '5'})).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
