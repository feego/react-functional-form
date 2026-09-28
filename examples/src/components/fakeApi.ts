/** Stand-in for a real backend, so the examples can show async behavior. */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const takenUsernames = ['admin', 'root', 'rui']

export const api = {
  async isUsernameTaken(username: string) {
    await wait(600)
    return takenUsernames.includes(username.trim().toLowerCase())
  },
  async register(values: { email: string; password: string }) {
    await wait(700)
    if (values.email.endsWith('@example.com')) {
      throw { fieldErrors: { email: 'This email is already registered' } }
    }
  },
  async save<T>(values: T) {
    await wait(500)
    return values
  },
}

export const notify = (message: string) => window.alert(message)
