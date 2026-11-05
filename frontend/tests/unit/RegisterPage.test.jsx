it('shows a message when the gateway returns 502', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('no JSON body');
    },
  });
  renderPage();
  await fillAndSubmit({ email: 'ada@example.com', password: 'longenough' });

  expect(
    await screen.findByText('Could not reach the server'),
  ).toBeInTheDocument();
});