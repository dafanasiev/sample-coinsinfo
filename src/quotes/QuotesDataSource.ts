export interface QuotesDataSourceSettings {
    global: { url: string, interval: number, alias: string };
    bitcoin: { url: string, interval: number, alias: string };
    ethereum: { url: string, interval: number, alias: string };
    litecoin: { url: string, interval: number, alias: string };
}

export class QuotesDataSource {
    private readonly defaults: QuotesDataSourceSettings = {
        global: {
            url: 'https://api.coinmarketcap.com/v1/global/',
            interval: 2000,
            alias: 'global'
        },

        bitcoin: {
            url: 'https://api.coinmarketcap.com/v1/ticker/bitcoin/',
            interval: 2000,
            alias: 'BTC'
        },

        ethereum: {
            url: 'https://api.coinmarketcap.com/v1/ticker/ethereum/',
            interval: 2000,
            alias: 'ETH'
        },

        litecoin: {
            url: 'https://api.coinmarketcap.com/v1/ticker/litecoin/',
            interval: 2000,
            alias: 'LiteCoin'
        }
    };

    private readonly settings: QuotesDataSourceSettings;

    private readonly _onData = new LiteEvent<any>();

    private readonly fetchers = new Array<DataFetcher>();

    public constructor(settings: QuotesDataSourceSettings) {
        this.settings = { ...this.defaults, ...settings };
    }

    public onData(cb: (sender: any, data?: any) => void) { this._onData.on(cb); }
    public offData(cb: (sender: any, data?: any) => void) { this._onData.off(cb); }

    public connect() {
        for (const p in this.settings) {
            if (this.settings.hasOwnProperty(p)) {
                const sp = this.settings[p];
                this.fetchers.push(new DataFetcher(sp.url,
                    sp.interval,
                    d => this._onData.trigger(this, {
                        alias: sp.alias,
                        data: d
                    })
                ));
            }
        }

        this.fetchers.forEach(f => f.start());
    }

    public disconnect() {
        this.fetchers.forEach(f => f.stop());
    }
}

class DataFetcher {
    private readonly url: string;
    private readonly timeout: number;
    private timer: any;
    private readonly onFetched: (data: any) => void;

    public constructor(url: string, timeout: number, onFetched: (data: any) => void) {
        this.url = url;
        this.timeout = timeout;
        this.onFetched = onFetched;
    }
    public start() {
        this.timer = setTimeout(() => this.onTick(), this.timeout);
    }

    public stop() {
        if (typeof this.timer !== 'undefined') {
            clearInterval(this.timer);
        }
    }

    private onTick() {
        getJSON(this.url, (d: any) => {
            this.onFetched(d);
            this.timer = setTimeout(() => this.onTick(), this.timeout);
        }, (err: any) => {
            console.error('Fail to fetch data', err);
            this.timer = setTimeout(() => this.onTick(), this.timeout);
        });
    }
}

interface ILiteEvent<T> {
    on(handler: (sender: any, data?: T) => void): void;
    off(handler: (sender: any, data?: T) => void): void;
}

class LiteEvent<T> implements ILiteEvent<T> {
    private handlers: Array<(sender: any, data?: T) => void> = [];

    public on(handler: (sender: any, data?: T) => void): void {
        this.handlers.push(handler);
    }

    public off(handler: (sender: any, data?: T) => void): void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    public trigger(sender: any, data?: T) {
        this.handlers.slice(0).forEach(h => h(sender, data));
    }

    public expose(): ILiteEvent<T> {
        return this;
    }
}

// tslint:disable

function getJSON(url: string, successHandler: any, errorHandler: any) {
    var xhr: any = typeof XMLHttpRequest != 'undefined'
        ? new XMLHttpRequest()
        : new (window as any).ActiveXObject('Microsoft.XMLHTTP');
    xhr.open('get', url, true);
    xhr.onreadystatechange = function () {
        var status;
        var data;
        // https://xhr.spec.whatwg.org/#dom-xmlhttprequest-readystate
        if (xhr.readyState == 4) { // `DONE`
            status = xhr.status;
            if (status == 200) {
                data = JSON.parse(xhr.responseText);
                successHandler && successHandler(data);
            } else {
                errorHandler && errorHandler(status);
            }
        }
    };
    xhr.send();
};