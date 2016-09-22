export class Provider implements angular.IServiceProvider {
    public $get;
    public names : {[resourceType : string]: string};

    constructor() {
        this.$get = () => new Service(this);
        this.names = {};
    }
}

export class Service {
    constructor(private provider : Provider) {}

    public getName(resourceType : string, amount? : number) : string {
        var ret : string;
        if (typeof this.provider.names[resourceType] !== "undefined") {
            ret = this.provider.names[resourceType];
        } else {
            ret = "TR__RESOURCE";
        }
        return amount !== 1 ? ret + "_PLURAL" : ret;
    }
}
