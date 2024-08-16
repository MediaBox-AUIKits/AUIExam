import { AliVCInteraction } from "../../typings/AliVCInteraction";

const { ImEngine } = window.AliVCInteraction;
// 定时重新间隔
const RETRY_INTERVAL = 5000;

export enum DisconnectCodes {
  Leave = 1, // 主动退出
  Kicked = 2, // 被踢出群组
  Timeout = 3, // 超时
  OtherDeviceLogin = 4, // 同一个账号在其他端登录
}

export interface ITokenConfig {
  appId: string;
  appSign: string;
  appToken: string;
  auth: {
    nonce: string;
    role?: string;
    timestamp: number;
    userId: string;
  };
}

class AlivcImEngine {
  private engine: AliVCInteraction.ImEngine;
  private tokenConfig?: ITokenConfig;
  private refreshTokenFunc?: () => Promise<ITokenConfig>;
  private logined: boolean = false;
  private joinedGroupId: string = '';
  private retrying: boolean = false;
  private tokenexpired: boolean = false;

  constructor() {
    this.engine = new ImEngine();
  }

  setTokenConfig(tokenConfig: ITokenConfig, refreshFunc: () => Promise<ITokenConfig>) {
    this.tokenConfig = tokenConfig;
    this.refreshTokenFunc = refreshFunc;
  }

  /**
   * init
   */
  public async initEngine() {
    if (!this.tokenConfig) {
      throw new Error('Need set tokenConfig');
    }

    await this.engine.init({
      appId: this.tokenConfig.appId,
      appSign: this.tokenConfig.appSign,
      source: 'AUIExam',
    })

    this.listenConnectEvents();
  }

  public on<K extends keyof AliVCInteraction.ImSdkListener>(event: K, cb: AliVCInteraction.ImSdkListener[K]) {
    this.engine.on(event, cb as any);
  }

  private listenConnectEvents() {
    this.engine.on('connecting', () => {
      console.log('myengine connecting');
    });
    this.engine.on('connectfailed', () => {
      console.log('myengine connectfailed');
    });
    this.engine.on('connectsuccess', () => {
      console.log('myengine connectsuccess');
    });
    this.engine.on('disconnect', (reason: number) => {
      console.log('myengine disconnect', this.retrying, reason);
      // 目前考试项目仅需处理超时情况，其他断联时不处理
      if (this.retrying || reason !== DisconnectCodes.Timeout) {
        return;
      }
      this.retrying = true;
      this.handleDisconnect();
    });
    this.engine.on('tokenexpired', (cb) => {
      console.log('myengine tokenexpired');
      this.tokenexpired = true;
      // 直接报错，通过disconnect重连
      cb({
        code: -1,
        msg: 'tokenexpired',
      });
    });
    this.engine.on('reconnectsuccess', () => {
      console.log('myengine reconnectsuccess');
    });
  }

  private handleDisconnect() {
    // 当异常断开时，定时重连，直接重新连上
    const retry = async () => {
      if (!this.logined || !this.joinedGroupId) {
        this.retrying = false;
        return;
      }

      try {
        console.log('myengine retry started')
        if (this.tokenexpired && this.refreshTokenFunc) {
          this.tokenConfig = await this.refreshTokenFunc();
        }
        await this.loginEngine();
        await this.joinGroup(this.joinedGroupId);
        this.retrying = false;
        this.tokenexpired = false;
        console.log('myengine retry success');
      } catch (error: any) {
        // 若是没有成功，再定时执行
        console.log('myengine retry error ->', error);
        if (error && error.message === 'auth fail') {
          // 当 auth fail 时需要重新获取 token
          this.tokenexpired = true;
        }
        this.handleDisconnect();
      }
    };
    
    setTimeout(() => retry(), RETRY_INTERVAL);
  }

  /**
   * loginEngine
   */
  public async loginEngine() {
    if (!this.tokenConfig) {
      throw new Error('Need set tokenConfig');
    }

    const res = await this.engine.login({
      user: {
        userId: this.tokenConfig.auth.userId,
      },
      userAuth: {
        nonce: this.tokenConfig.auth.nonce,
        timestamp: this.tokenConfig.auth.timestamp,
        role: this.tokenConfig.auth.role,
        token: this.tokenConfig.appToken,
      },
    });
    this.logined = true;
    return res;
  }

  public async logout() {
    const res = await this.engine.logout();
    this.logined = false;
    return res;
  }

  /**
   * getGroupManager
   */
  public getGroupManager() {
    const manager = this.engine.getGroupManager();
    if (!manager) {
      throw new Error('GroupManager is not defined');
    }
    return manager;
  }

  public getMessageManager() {
    const manager = this.engine.getMessageManager();
    if (!manager) {
      throw new Error('MessageManager is not defined');
    }
    return manager;
  }

  /**
   * joinGroup
   */
  public async joinGroup(groupId: string) {
    const manager = this.getGroupManager();
    return manager.joinGroup(groupId)
      .then(res => {
        this.joinedGroupId = groupId;
        return res;
      });
  }

  /**
   * leaveGroup
   */
  public async leaveGroup() {
    if (!this.joinedGroupId) {
      return true;
    }

    const manager = this.getGroupManager();

    return manager.leaveGroup(this.joinedGroupId)
      .then(res => {
        this.joinedGroupId = '';
        return res;
      });
  }
};

export default AlivcImEngine;
