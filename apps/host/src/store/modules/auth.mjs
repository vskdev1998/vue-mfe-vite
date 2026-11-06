import { authService } from '@/services/authService'
import { AUTH_STORAGE_KEY, emitMfeEvent } from '@/utils/mfeBus'

/**
 * auth module (namespaced)
 * Persists the session to sessionStorage under AUTH_STORAGE_KEY.
 * That key is the *contract* with the remotes: their own axios instances
 * read the token from it (see shell-a/src/services/http.js).
 */
export default {
  namespaced: true,

  state: () => ({
    user: null,
    token: null,
    status: 'idle', // idle | loading | error
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) =>
      // lodash (auto-imported as `_`): join non-empty parts, normalise casing
      state.user ? _.startCase(_.compact([state.user.firstName, state.user.lastName]).join(' ')) : '',
  },

  mutations: {
    SET_STATUS(state, status) {
      state.status = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    SET_SESSION(state, { user, token }) {
      state.user = user
      state.token = token
    },
    CLEAR_SESSION(state) {
      state.user = null
      state.token = null
    },
  },

  actions: {
    async login({ commit }, credentials) {
      commit('SET_STATUS', 'loading')
      commit('SET_ERROR', null)
      try {
        const session = await authService.login(credentials)
        commit('SET_SESSION', session)
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
        emitMfeEvent('auth-changed', { user: session.user })
        commit('SET_STATUS', 'idle')
        return session
      } catch (err) {
        commit('SET_STATUS', 'error')
        commit('SET_ERROR', err.message || 'Login failed')
        throw err
      }
    },

    restore({ commit }) {
      try {
        const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
        if (raw) commit('SET_SESSION', JSON.parse(raw))
      } catch {
        sessionStorage.removeItem(AUTH_STORAGE_KEY)
      }
    },

    logout({ commit }) {
      commit('CLEAR_SESSION')
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
      emitMfeEvent('auth-changed', { user: null })
    },
  },
}
