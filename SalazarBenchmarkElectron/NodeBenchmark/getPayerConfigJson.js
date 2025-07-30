const fs = require("fs");
const path = require("path");

function lerConfigJson(){
    const configPath = path.join(
        process.env.APPDATA,
        'payer-checkout-application',
        'config.json'
    );

    console.log("APPDATA =", process.env.APPDATA);
    console.log("Tentando ler config em:", configPath);

    try{
        const raw = fs.readFileSync(configPath, 'utf8');
        // console.log("Conteúdo bruto do config.json:", raw);

        const config = JSON.parse(raw);
        // console.log("Conteúdo JSON parseado:", config);

        if(config.checkoutConfig?.userConfig){
            const { cnpj, shopCode, checkoutID, socialReason } = config.checkoutConfig?.userConfig;
            console.log("userConfig encontrada:", config.checkoutConfig?.userConfig);
            return { cnpj, shopCode, checkoutID, socialReason };
        } else{
            console.warn("Chave userConfig não foi encontrada no config.json");
            return null;
        }
    }catch(error){
        console.error("Erro ao ler o config.json", error);
        return null;
    }
}

module.exports = { lerConfigJson };
if (require.main === module) {
  lerConfigJson();
}