import { BasicMap } from "@/types";

export default class Emitter {
  private handlerList: BasicMap<any[]> = {};

  public emit(eventName: string, eventData: any) {
    const eventHandlers = this.handlerList[eventName];
    if (!eventHandlers) return;
    for (let i = 0; i < eventHandlers.length; i++) {
      eventHandlers[i](eventData);
    }
  }

  public on(eventName: string, eventHandler: any) {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.handlerList?.hasOwnProperty(eventName)) {
      this.handlerList[eventName] = [];
    }
    this.handlerList[eventName].push(eventHandler);
  }

  public remove(eventName: string, eventHandler?: any) {
    if (!eventHandler) {
      delete this.handlerList[eventName];
      return;
    }
    const eventHandlers = this.handlerList[eventName] || [];
    const handlerIndex = eventHandlers.findIndex((e) => e === eventHandler);
    if (handlerIndex > -1) {
      this.handlerList[eventName].splice(handlerIndex, 1);
      if (this.handlerList[eventName].length === 0)
        delete this.handlerList[eventName];
    }
  }

  public removeAllEvents() {
    this.handlerList = {};
  }
}
