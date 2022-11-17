import { InteractionStore } from "./interaction";
import { ChainInfo } from "@keplr-wallet/types";
import {
  ChainInfoWithRepoUpdateOptions,
  SuggestChainInfoMsg,
} from "@keplr-wallet/background";
import { flow, makeObservable, observable } from "mobx";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import Axios from "axios";

export class ChainSuggestStore {
  @observable
  protected _isLoading: boolean = false;

  @observable
  communityChainInfo: ChainInfo | undefined = undefined;

  constructor(
    protected readonly interactionStore: InteractionStore,
    protected readonly communityChainInfoRepo: {
      readonly organizationName: string;
      readonly repoName: string;
    }
  ) {
    makeObservable(this);
  }

  get waitingSuggestedChainInfo() {
    const datas = this.interactionStore.getDatas<
      ChainInfo & { origin: string }
    >(SuggestChainInfoMsg.type());

    if (datas.length > 0) {
      return datas[0];
    }
  }

  get communityChainInfoRepoUrl(): string {
    return `https://github.com/${this.communityChainInfoRepo.organizationName}/${this.communityChainInfoRepo.repoName}`;
  }

  getCommunityChainInfoUrl(chainId: string): string {
    const chainIdHelper = ChainIdHelper.parse(chainId);
    return `${this.communityChainInfoRepoUrl}/blob/main/cosmos/${chainIdHelper.identifier}.json`;
  }

  @flow
  *fetchCommunityChainInfo() {
    this._isLoading = true;

    if (this.waitingSuggestedChainInfo) {
      try {
        const chainIdentifier = ChainIdHelper.parse(
          this.waitingSuggestedChainInfo.data.chainId
        ).identifier;
        const chainInfoResponse = yield Axios.get<ChainInfo>(
          `/cosmos/${chainIdentifier}.json`,
          {
            baseURL: `https://raw.githubusercontent.com/${this.communityChainInfoRepo.organizationName}/${this.communityChainInfoRepo.repoName}/main`,
          }
        );

        this.communityChainInfo = chainInfoResponse.data;
      } finally {
        this._isLoading = false;
      }
    }
  }

  @flow
  *approve(chainInfo: ChainInfoWithRepoUpdateOptions) {
    this._isLoading = true;

    try {
      const data = this.waitingSuggestedChainInfo;

      if (data) {
        yield this.interactionStore.approve(data.type, data.id, chainInfo);
      }
    } finally {
      this._isLoading = false;
    }
  }

  @flow
  *reject() {
    this._isLoading = true;

    try {
      const data = this.waitingSuggestedChainInfo;
      if (data) {
        yield this.interactionStore.reject(data.type, data.id);
      }
    } finally {
      this._isLoading = false;
    }
  }

  @flow
  *rejectAll() {
    this._isLoading = true;
    try {
      yield this.interactionStore.rejectAll(SuggestChainInfoMsg.type());
    } finally {
      this._isLoading = false;
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }
}
