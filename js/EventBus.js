// js/EventBus.js

export const EventBus = {
  listeners: {},
  subscribe(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  },
  emit(eventName, payload) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(callback => callback(payload));
    }
  }
};