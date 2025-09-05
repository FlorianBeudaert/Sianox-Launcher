/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        this.hideAllPanels();
        document.querySelector('.login-home').style.display = 'block';

        document.querySelector('.connect-home').onclick = () => this.getMicrosoft();
        document.querySelector('.connect-offline-home').onclick = () => this.getCrack();
        document.querySelector('.cancel-home').onclick = () => {
            document.querySelector('.cancel-home').style.display = 'none';
            this.hideAllPanels();
            document.querySelector('.login-home').style.display = 'block';
            if (window.fromSettings) {
                window.fromSettings = false;
                changePanel('settings');
            }
        };
    }

    hideAllPanels() {
        document.querySelector('.login-home').style.display = 'none';
        document.querySelector('.login-offline').style.display = 'none';
        document.querySelector('.login-AZauth').style.display = 'none';
        document.querySelector('.login-AZauth-A2F').style.display = 'none';
    }

    async getMicrosoft() {
        this.hideAllPanels();
        let popupLogin = new popup();
        popupLogin.openPopup({
            title: 'Connexion',
            content: 'Veuillez patienter...',
            color: 'var(--color)'
        });

        try {
            const account_connect = await ipcRenderer.invoke('Microsoft-window', this.config.client_id);
            popupLogin.closePopup();
            if (account_connect == 'cancel' || !account_connect) {
                document.querySelector('.login-home').style.display = 'block';
                return;
            }
            await this.saveData(account_connect);
        } catch (err) {
            popupLogin.openPopup({
                title: 'Erreur',
                content: err,
                options: true
            });
            this.hideAllPanels();
            document.querySelector('.login-home').style.display = 'block';
        }
    }

    async getCrack() {
        this.hideAllPanels();
        document.querySelector('.login-offline').style.display = 'block';
        const popupLogin = new popup();
        const emailOffline = document.querySelector('.email-offline');
        const connectOffline = document.querySelector('.connect-offline');
        const cancelOffline = document.querySelector('.cancel-offline');

        connectOffline.onclick = null;
        cancelOffline.onclick = null;

        connectOffline.onclick = async () => {
            if (emailOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo doit faire au moins 3 caractères.',
                    options: true
                });
                return;
            }
            if (emailOffline.value.match(/ /g)) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: 'Votre pseudo ne doit pas contenir d\'espaces.',
                    options: true
                });
                return;
            }
            let MojangConnect = await Mojang.login(emailOffline.value);
            if (MojangConnect.error) {
                popupLogin.openPopup({
                    title: 'Erreur',
                    content: MojangConnect.message,
                    options: true
                });
                return;
            }
            const success = await this.saveData(MojangConnect);
            if (success) popupLogin.closePopup();
        };

        cancelOffline.style.display = 'inline';
        cancelOffline.onclick = () => {
            cancelOffline.style.display = 'none';
            this.hideAllPanels();
            document.querySelector('.login-home').style.display = 'block';
        };
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let allAccounts = await this.db.readAllData('accounts');
        if (allAccounts.some(acc => acc.name === connectionData.name)) {
            let popupError = new popup();
            popupError.openPopup({
                title: 'Erreur',
                content: 'Un compte avec ce pseudo existe déjà.',
                options: true
            });
            return false;
        }
        let account = await this.db.createData('accounts', connectionData);
        let instanceSelect = configClient.instance_selct;
        let instancesList = await config.getInstanceList();
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name);
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false);
                        configClient.instance_selct = newInstanceSelect.name;
                        await setStatus(newInstanceSelect.status);
                    }
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        this.hideAllPanels();
        changePanel('home');
        return true;
    }
}
export default Login;