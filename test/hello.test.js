import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('matches its reference', async () => {
  document.body.innerHTML = '<p style="font: 24px sans-serif; padding: 16px">Hello</p>'
  await expect.element(page.getByText('Hello')).toMatchScreenshot('hello')
})
