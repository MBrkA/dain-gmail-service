import { OAuth2Tokens } from "@dainprotocol/service-sdk";

export class TokenStore {
  private _tokenStore: Map<string, OAuth2Tokens>;

  constructor() {
    this._tokenStore = new Map<string, OAuth2Tokens>();
  }

  public getToken(agentId: string): OAuth2Tokens | undefined {
    return this._tokenStore.get(agentId);
  }

  public setToken(agentId: string, tokens: OAuth2Tokens): void {
    this._tokenStore.set(agentId, tokens);
  }

  public deleteToken(agentId: string): void {
    this._tokenStore.delete(agentId);
  }

  public clear(): void {
    this._tokenStore.clear();
  }
}

let tokenStore: TokenStore | undefined;

export function getTokenStore(): TokenStore {
  if (!tokenStore) tokenStore = new TokenStore();
  return tokenStore;
}
