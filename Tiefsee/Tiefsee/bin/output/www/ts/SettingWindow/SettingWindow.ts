//import { contains } from "jquery";

var baseWindow: BaseWindow;

var setting;
document.addEventListener("DOMContentLoaded", async () => {
    setting = new Setting();
});

class Setting {

    public saveData;

    constructor() {

        baseWindow = new BaseWindow(); //初始化視窗

        this.saveData = saveSetting;

        var appInfo: AppInfo;
        var config = new Config(baseWindow);
        var mainToolbar = new MainToolbar(null); //取得工具列
        var i18n = new I18n();
        i18n.initNone(); //有翻譯的地方都顯示空白(用於翻譯前)
        i18n.pushData(langData);
        var msgbox = new Msgbox(i18n);

        var loadEvent: (() => void)[] = [];
        /**
         * 讀取設定完成後執行的工作
         * @param func 
         */
        function addLoadEvent(func: () => void) {
            loadEvent.push(func);
        }

        //initDomImport(); //初始化圖示

        /**
          * 覆寫 onCreate
          * @param json 
          */
        baseWindow.onCreate = async (json: AppInfo) => {

            baseWindow.appInfo = json;

            await WV_Window.ShowWindowAtCenter(600 * window.devicePixelRatio, 450 * window.devicePixelRatio); //顯示視窗 
            WV_Window.SetMinimumSize(400 * window.devicePixelRatio, 300 * window.devicePixelRatio); //設定視窗最小size
            WV_Window.Text = "Setting";
            let iconPath = Lib.Combine([await WV_Window.GetAppDirPath(), "www\\img\\logo.ico"]);
            WV_Window.SetIcon(iconPath);

            //關閉視窗前觸發
            baseWindow.closingEvents.push(async () => {
                await saveSetting();
            });

            //拖曳視窗
            let domLeftBox = document.querySelector("#window-left .pagetab") as HTMLElement;
            domLeftBox.addEventListener("mousedown", async (e) => {

                //如果有捲動軸，就禁止拖曳(避免無法點擊捲動軸)
                if (Lib.isScrollbarVisible(domLeftBox)) { return; }

                let _dom = e.target as HTMLElement;
                if (_dom) {
                    if (_dom.classList.contains("js-noDrag")) { return; }
                }
                if (e.button === 0) { //滑鼠左鍵
                    await WV_Window.WindowDrag("move");
                }
            })
            domLeftBox.addEventListener("touchstart", async (e) => {

                //如果有捲動軸，就禁止拖曳(避免無法點擊捲動軸)
                if (Lib.isScrollbarVisible(domLeftBox)) { return; }

                let _dom = e.target as HTMLDivElement;
                if (_dom) {
                    if (_dom.classList.contains("js-noDrag")) { return; }
                }
                baseWindow.touchDrop.start(domLeftBox, e, "move");
            });

            tippy(".img-help", {
                /*content(reference: HTMLElement) {
                    const id = reference.getAttribute("data-tooltip");
                    if (id === null) { return ""; }
                    const template = document.getElementById(id);
                    return template?.innerHTML;
                },*/
                onShow(instance: any) {
                    const dataI18n = instance.reference.getAttribute("data-i18n");
                    let t = dataI18n;
                    if (t !== null) {
                        t = i18n.t(dataI18n)
                    }
                    instance.setContent(t);
                },
                allowHTML: true,
                animation: "tippyMyAnimation",
                theme: "tippyMyTheme",
                arrow: false, //箭頭
            });

            //-------------

            appInfo = json;

            //讀取設定檔
            var userSetting = {};
            try {
                userSetting = JSON.parse(json.settingTxt);
            } catch (e) { }
            $.extend(true, config.settings, userSetting);

            //執行
            loadEvent.forEach(func => {
                func()
            });

            //document.querySelector("input")?.focus();
            document.querySelector("input")?.blur(); //失去焦點
        }

        //初始化多國語言
        addLoadEvent(() => {

            let dom_select = document.querySelector("#select-lang") as HTMLSelectElement;

            let configLang = config.settings.other.lang;
            if (configLang == "") {
                configLang = Lib.getBrowserLang();
            }
            dom_select.value = configLang;
            i18n.setLang(configLang); //更新畫面的語言

            dom_select.addEventListener("change", () => {
                let val = dom_select.value;
                config.settings.other.lang = val;
                appleSettingOfMain();
                i18n.setLang(val); //更新畫面的語言
            });

        })

        //初始化頁面分頁
        addLoadEvent(() => {

            //捲到最上面
            function goTop() {
                document.querySelector("#window-body")?.scrollTo(0, 0)
            }

            function getDom(id: string) {
                return document.getElementById(id);
            }

            var tabs = new Tabs();
            tabs.add(getDom("tabsBtn-general"), getDom("tabsPage-general"), () => { goTop() }); //一般
            tabs.add(getDom("tabsBtn-appearance"), getDom("tabsPage-appearance"), () => { goTop() }); //外觀
            tabs.add(getDom("tabsBtn-layout"), getDom("tabsPage-layout"), () => { goTop() }); //版面
            tabs.add(getDom("tabsBtn-toolbar"), getDom("tabsPage-toolbar"), () => { goTop() }); //工具列
            //tabs.add(getDom("tabsBtn-image"), getDom("tabsPage-image"), () => { goTop() });
            //tabs.add(getDom("tabsBtn-shortcutKeys"),getDom("tabsPage-hotkey"), () => { goTop() });/快速鍵
            tabs.add(getDom("tabsBtn-extension"), getDom("tabsPage-extension"), () => { goTop() }); //設為預設程式
            tabs.add(getDom("tabsBtn-advanced"), getDom("tabsPage-advanced"), () => { goTop() }); //進階設定
            tabs.add(getDom("tabsBtn-about"), getDom("tabsPage-about"), () => { goTop() }); //關於
            tabs.add(getDom("tabsBtn-plugin"), getDom("tabsPage-plugin"), () => { goTop() }); //擴充套件
            tabs.add(getDom("tabsBtn-quickLook"), getDom("tabsPage-quickLook"), () => { goTop() }); //快速預覽

            tabs.set(getDom("tabsBtn-general")); //預設選擇的頁面
        })

        //自訂工具列
        addLoadEvent(() => {

            var mainToolbarArray = mainToolbar.getArrray();

            const arGroupName = ["img", "pdf", "txt", "bulkView"];
            arGroupName.map((gn) => {

                let groupName = gn as ("img" | "pdf" | "txt" | "bulkView");
                var dom_toolbarList = document.querySelector(`#toolbarList-${groupName}`) as HTMLElement;

                //產生html
                var html = "";
                for (let i = 0; i < mainToolbarArray.length; i++) {
                    const item = mainToolbarArray[i];

                    if (item.type !== "button") { continue; }
                    let h = `
                        <div class="toolbarList-item" data-name="${item.name}">
                            <input class="toolbarList-checkbox base-checkbox" type="checkbox" data-name="${item.name}" checked>
                            ${SvgList[item.icon]}
                            ${i18n.tSpan(item.i18n)}
                        </div>`
                    if (item.group == groupName) { html += h; }
                }
                dom_toolbarList.innerHTML = html;

                //初始化 排序
                let arMainToolbar = config.settings.mainToolbar[groupName];
                for (let i = 0; i < arMainToolbar.length; i++) {
                    let item = arMainToolbar[i];
                    let ardomToolbarList = dom_toolbarList.querySelectorAll(".toolbarList-item");
                    let d1 = ardomToolbarList[i];
                    let d2 = dom_toolbarList.querySelector(`[data-name=${item.n}]`);
                    if (d1 == undefined) { break; }
                    if (d2 === null) { continue; }
                    swapDom(d1, d2); //dom 交換順序
                }

                //初始化 checkbox狀態
                for (let i = 0; i < arMainToolbar.length; i++) {
                    let item = arMainToolbar[i];
                    let d2 = dom_toolbarList.querySelector(`[data-name=${item.n}]`);
                    if (d2 === null) { continue; }
                    const domCheckbox = d2.querySelector(".toolbarList-checkbox") as HTMLInputElement;
                    domCheckbox.checked = item.v;
                }

                //給每一個checkbox都註冊onchange
                let domAr_checkbox = dom_toolbarList.querySelectorAll(".toolbarList-checkbox");
                for (let i = 0; i < domAr_checkbox.length; i++) {
                    const domCheckbox = domAr_checkbox[i] as HTMLInputElement;
                    domCheckbox.onchange = () => {
                        let data = getToolbarListData();
                        config.settings.mainToolbar = data;
                        appleSettingOfMain();
                    }
                }

                //初始化拖曳功能
                new Sortable(dom_toolbarList, {
                    animation: 150,
                    onEnd: (evt) => {
                        let data = getToolbarListData();
                        config.settings.mainToolbar = data;
                        appleSettingOfMain();
                    }
                });

            })

            /** 取得排序與顯示狀態 */
            function getToolbarListData() {
                function getItem(type: string) {
                    let ar = [];
                    let dom_toolbarList = document.querySelector(`#toolbarList-${type}`) as HTMLElement;
                    let domAr = dom_toolbarList.querySelectorAll(".toolbarList-checkbox");

                    for (let i = 0; i < domAr.length; i++) {
                        const domCheckbox = domAr[i] as HTMLInputElement;
                        let name = domCheckbox.getAttribute("data-name") + "";
                        let val = domCheckbox.checked;
                        ar.push({
                            n: name,
                            v: val
                        })
                    }
                    return ar;
                }

                let data = {
                    img: getItem("img"),
                    pdf: getItem("pdf"),
                    txt: getItem("txt"),
                    bulkView: getItem("bulkView"),
                };
                return data
            }

            //------------

            //切換下拉選單時，顯示對應的內容
            var select_toolbarListType = document.querySelector("#select-toolbarListType") as HTMLSelectElement;
            var dom_toolbarList_img = document.querySelector("#toolbarList-img") as HTMLElement;
            var dom_toolbarList_pdf = document.querySelector("#toolbarList-pdf") as HTMLElement;
            var dom_toolbarList_txt = document.querySelector("#toolbarList-txt") as HTMLElement;
            var dom_toolbarList_bulkView = document.querySelector("#toolbarList-bulkView") as HTMLElement;
            let eventChange = () => {
                let val = select_toolbarListType.value;
                if (val == "img") {
                    dom_toolbarList_img.style.display = "block";
                    dom_toolbarList_pdf.style.display = "none";
                    dom_toolbarList_txt.style.display = "none";
                    dom_toolbarList_bulkView.style.display = "none";
                }
                if (val == "pdf") {
                    dom_toolbarList_img.style.display = "none";
                    dom_toolbarList_pdf.style.display = "block";
                    dom_toolbarList_txt.style.display = "none";
                    dom_toolbarList_bulkView.style.display = "none";
                }
                if (val == "txt") {
                    dom_toolbarList_img.style.display = "none";
                    dom_toolbarList_pdf.style.display = "none";
                    dom_toolbarList_txt.style.display = "block";
                    dom_toolbarList_bulkView.style.display = "none";
                }
                if (val == "bulkView") {
                    dom_toolbarList_img.style.display = "none";
                    dom_toolbarList_pdf.style.display = "none";
                    dom_toolbarList_txt.style.display = "none";
                    dom_toolbarList_bulkView.style.display = "block";
                }
            }
            select_toolbarListType.onchange = eventChange;
            eventChange();

        });

        //主題
        addLoadEvent(() => {

            //var cssRoot = document.documentElement;
            var jq_colorWindowBackground = $("#text-colorWindowBackground"); //視窗顏色
            var jq_colorWindowBorder = $("#text-colorWindowBorder"); //邊框顏色
            var jq_colorWhite = $("#text-colorWhite"); //文字顏色
            var jq_colorBlack = $("#text-colorBlack"); //區塊底色
            var jq_colorBlue = $("#text-colorBlue"); //主顏色
            var dom_applyThemeBtns = document.querySelector("#applyTheme-btns") as HTMLElement;

            //初始化顏色選擇器物件
            addEvent(jq_colorWindowBackground, "--color-window-background", true);
            addEvent(jq_colorWindowBorder, "--color-window-border", true);
            addEvent(jq_colorWhite, "--color-white", false);
            addEvent(jq_colorBlack, "--color-black", false);
            addEvent(jq_colorBlue, "--color-blue", false);
            //add(jQdom_theme_colorGrey, "--color-grey", false);

            applyTheme()

            //初始化顏色選擇器物件
            function addEvent(jQdim: JQuery, name: string, opacity: boolean = false) {

                //@ts-ignore
                jQdim.minicolors({
                    format: "rgb",
                    opacity: opacity,
                    changeDelay: 10, //change時間的更新延遲
                    change: function (value: string, opacity: number) {

                        //@ts-ignore
                        let c = jQdim.minicolors("rgbObject"); //取得顏色 

                        //設定本身視窗的主題
                        /*for (let i = 1; i < 9; i++) {
                            cssRoot.style.setProperty(name + `${i}0`, `rgba(${c.r}, ${c.g}, ${c.b}, ${(i / 10)} )`)
                        }
                        cssRoot.style.setProperty(name, value);*/

                        //設定父親視窗的主題
                        //@ts-ignore
                        config.settings["theme"][name] = c;
                        appleSettingOfMain();
                    }
                });
            }

            //讀取設定，套用顏色
            function applyTheme() {
                //修改輸入框的文字
                function setRgb(jqdom: JQuery<HTMLElement>, c: { r: number, g: number, b: number, }) {
                    //@ts-ignore
                    jqdom.minicolors("value", `rgb(${c.r}, ${c.g}, ${c.b})`);
                }
                function setRgba(jqdom: JQuery<HTMLElement>, c: { r: number, g: number, b: number, a: number, }) {
                    //@ts-ignore
                    jqdom.minicolors("value", `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`);
                }
                //修改輸入框的文字
                setRgba(jq_colorWindowBackground, config.settings.theme["--color-window-background"]);
                setRgba(jq_colorWindowBorder, config.settings.theme["--color-window-border"]);
                setRgb(jq_colorWhite, config.settings.theme["--color-white"]);
                setRgb(jq_colorBlack, config.settings.theme["--color-black"]);
                setRgb(jq_colorBlue, config.settings.theme["--color-blue"]);
            }

            //-------------

            //初始化主題按鈕
            applyThemeAddBtn( //深色主題
                `<div class="btn" i18n="sw.theme.darkTheme">${i18n.t("sw.theme.darkTheme")}</div>`,
                { r: 31, g: 39, b: 43, a: 0.97 },
                { r: 255, g: 255, b: 255, a: 0.25 },
                { r: 255, g: 255, b: 255, },
                { r: 0, g: 0, b: 0, },
                { r: 0, g: 200, b: 255, },
            )
            applyThemeAddBtn( //深色主題
                `<div class="btn" i18n="sw.theme.lightTheme">${i18n.t("sw.theme.lightTheme")}</div>`,
                { r: 255, g: 255, b: 255, a: 0.97 },
                { r: 112, g: 112, b: 112, a: 0.25 },
                { r: 0, g: 0, b: 0, },
                { r: 238, g: 238, b: 238, },
                { r: 0, g: 135, b: 220, },
            )

            //產生 套用主題 的按鈕
            function applyThemeAddBtn(html: string,
                windowBackground: { r: number, g: number, b: number, a: number },
                windowBorder: { r: number, g: number; b: number, a: number },
                white: { r: number, g: number, b: number },
                black: { r: number, g: number, b: number },
                blue: { r: number, g: number, b: number }) {

                let btn = Lib.newDom(html);
                btn.onclick = () => {
                    config.settings.theme["--color-window-background"] = windowBackground;
                    config.settings.theme["--color-window-border"] = windowBorder;
                    config.settings.theme["--color-white"] = white;
                    config.settings.theme["--color-black"] = black;
                    config.settings.theme["--color-blue"] = blue;
                    applyTheme()
                };
                dom_applyThemeBtns.append(btn);
            }
        });

        //圖片預設 縮放模式、對齊位置
        addLoadEvent(() => {
            var select_tiefseeviewZoomType = document.querySelector("#select-tiefseeviewZoomType") as HTMLSelectElement;
            var text_tiefseeviewZoomValue = document.querySelector("#text-tiefseeviewZoomValue") as HTMLInputElement;
            var select_tiefseeviewAlignType = document.querySelector("#select-tiefseeviewAlignType") as HTMLSelectElement;

            select_tiefseeviewZoomType.value = config.settings.image["tiefseeviewZoomType"];
            text_tiefseeviewZoomValue.value = config.settings.image["tiefseeviewZoomValue"].toString();
            select_tiefseeviewAlignType.value = config.settings.image["tiefseeviewAlignType"];

            //避免出現下拉選單沒有的值
            if (select_tiefseeviewZoomType.value == "") {
                select_tiefseeviewZoomType.value = "fitWindowOrImageOriginal";
            }
            if (select_tiefseeviewAlignType.value == "") {
                select_tiefseeviewAlignType.value = "center";
            }

            showValue();

            //顯示或隱藏 「圖片預設縮放模式」的附加欄位
            function showValue() {
                let val = select_tiefseeviewZoomType.value;
                let ar = ["imageWidthPx", "imageHeightPx", "windowWidthRatio", "windowHeightRatio"];
                if (ar.indexOf(val) !== -1) {
                    text_tiefseeviewZoomValue.style.display = "block";
                } else {
                    text_tiefseeviewZoomValue.style.display = "none";
                }
            }

            select_tiefseeviewZoomType.addEventListener("change", () => {
                showValue();
                let val = select_tiefseeviewZoomType.value;
                config.settings.image["tiefseeviewZoomType"] = val;
                appleSettingOfMain();
            });
            text_tiefseeviewZoomValue.addEventListener("change", () => {
                let val = Number(text_tiefseeviewZoomValue.value);
                if (isNaN(val)) { val = 100; }
                if (val > 99999) { val = 99999; }
                if (val < 1) { val = 1; }
                text_tiefseeviewZoomValue.value = val.toString();
                config.settings.image["tiefseeviewZoomValue"] = val;
                appleSettingOfMain();
            });
            select_tiefseeviewAlignType.addEventListener("change", () => {
                let val = select_tiefseeviewAlignType.value;
                config.settings.image["tiefseeviewAlignType"] = val;
                appleSettingOfMain();
            });
        })

        //預設排序
        addLoadEvent(() => {
            var select_fileSort = document.querySelector("#select-fileSort") as HTMLSelectElement;
            var select_dirSort = document.querySelector("#select-dirSort") as HTMLSelectElement;

            select_fileSort.value = config.settings.sort["fileSort"];
            select_dirSort.value = config.settings.sort["dirSort"];

            select_fileSort.addEventListener("change", () => {
                let val = select_fileSort.value;
                config.settings.sort["fileSort"] = val;
                appleSettingOfMain();
            });
            select_dirSort.addEventListener("change", () => {
                let val = select_dirSort.value;
                config.settings.sort["dirSort"] = val;
                appleSettingOfMain();
            });
        })

        //關聯副檔名 
        addLoadEvent(() => {
            var text_extension = document.querySelector("#text-extension") as HTMLTextAreaElement;
            var btn_extension = document.querySelector("#btn-extension") as HTMLElement;
            var text_disassociate = document.querySelector("#text-disassociate") as HTMLTextAreaElement;
            var btn_disassociate = document.querySelector("#btn-disassociate") as HTMLElement;

            let s_extension = ["JPG", "JPEG", "PNG", "GIF", "BMP", "SVG", "WEBP",];
            text_extension.value = s_extension.join("\n"); //預設顯示的文字
            text_disassociate.value = s_extension.join("\n"); //預設顯示的文字

            //關聯副檔名
            btn_extension.addEventListener("click", async (e) => {
                let ar_extension = text_extension.value.split("\n");
                let ar: string[] = [];
                for (let i = 0; i < ar_extension.length; i++) {
                    const item = ar_extension[i].toLocaleLowerCase().trim();
                    if (item !== "" && ar.indexOf(item) === -1) {
                        ar.push(item);
                    }
                }

                msgbox.show({
                    txt: i18n.t("msg.associationExtension") + "<br>" //確定用Tiefsee來開啟這些檔案嗎？
                        + ar.join(", "),
                    funcYes: async (dom: HTMLElement, inputTxt: string) => {
                        msgbox.close(dom);
                        let appPath = await WV_Window.GetAppPath();
                        await WV_System.AssociationExtension(ar, appPath);
                        msgbox.show({ txt: i18n.t("msg.done"), }); //處理完成
                    }
                });
            });

            //解除關聯副檔名
            btn_disassociate.addEventListener("click", async (e) => {
                let ar_extension = text_disassociate.value.split("\n");
                let ar: string[] = [];
                for (let i = 0; i < ar_extension.length; i++) {
                    const item = ar_extension[i].toLocaleLowerCase().trim();
                    if (item !== "" && ar.indexOf(item) === -1) {
                        ar.push(item);
                    }
                }

                msgbox.show({
                    txt: i18n.t("msg.removeAssociationExtension") + "<br>" //確定要解除這些檔案與Tiefsee的關聯嗎？
                        + ar.join(", "),
                    funcYes: async (dom: HTMLElement, inputTxt: string) => {
                        msgbox.close(dom);
                        let appPath = await WV_Window.GetAppPath();
                        await WV_System.RemoveAssociationExtension(ar, appPath);
                        msgbox.show({ txt: i18n.t("msg.done"), }); //處理完成
                    }
                });
            });
        })

        //開啟 系統設定
        addLoadEvent(() => {
            let btn = document.querySelector("#btn-openSystemSettings") as HTMLElement;

            btn.addEventListener("click", async () => {
                let path = "ms-settings:defaultapps";
                WV_RunApp.OpenUrl(path)
            });
        })

        //視窗 圓角
        addLoadEvent(() => {
            var jq_windowBorderRadius = $("#text-windowBorderRadius");
            jq_windowBorderRadius.val(config.settings.theme["--window-border-radius"]);

            jq_windowBorderRadius.on("change", () => {
                let val = Number(jq_windowBorderRadius.val());
                if (val < 0) { val = 0; }
                if (val > 15) { val = 15; }

                config.settings["theme"]["--window-border-radius"] = val;
                appleSettingOfMain();
            });
        })

        //視窗 縮放比例
        addLoadEvent(() => {
            var jq_zoomFactor = $("#text-zoomFactor");
            jq_zoomFactor.val(config.settings.theme["zoomFactor"]);
            jq_zoomFactor.on("change", () => {
                let val = Number(jq_zoomFactor.val());
                if (isNaN(val)) { val = 1; }
                if (val === 0) { val = 1; }
                if (val < 0.5) { val = 0.5; }
                if (val > 3) { val = 3; }

                config.settings["theme"]["zoomFactor"] = val;
                appleSettingOfMain();
            })

        })

        //文字粗細
        addLoadEvent(() => {
            var jqselect_fontWeight = $("#select-fontWeight");
            jqselect_fontWeight.val(config.settings.theme["fontWeight"]);

            jqselect_fontWeight.on("change", () => {
                let val = jqselect_fontWeight.val() as string;
                config.settings["theme"]["fontWeight"] = val;
                appleSettingOfMain();
            });
        })

        //圖示粗細
        addLoadEvent(() => {
            var jqselect_svgWeight = $("#select-svgWeight");
            jqselect_svgWeight.val(config.settings.theme["svgWeight"]);

            jqselect_svgWeight.on("change", () => {
                let val = jqselect_svgWeight.val() as string;
                config.settings["theme"]["svgWeight"] = val;
                appleSettingOfMain();
            });
        })

        // 視窗效果 (aero毛玻璃)
        addLoadEvent(() => {

            var switch_areo = document.querySelector("#select-aeroType") as HTMLSelectElement;
            switch_areo.value = config.settings["theme"]["aeroType"];

            switch_areo.addEventListener("change", () => {
                let val = switch_areo.value;
                config.settings["theme"]["aeroType"] = val;
            });

            //調整選項後，顯示「重新啟動」的按鈕
            var btn_restart = document.querySelector("#btn-windowAero-restart") as HTMLButtonElement;
            btn_restart.style.display = "none";
            switch_areo.addEventListener("change", () => {
                btn_restart.style.display = "";
            });
            btn_restart.addEventListener("click", () => {
                restartTiefsee();
            });
        })

        //工具列
        addLoadEvent(() => {
            var switch_mainToolbarEnabled = document.querySelector("#switch-mainToolbarEnabled") as HTMLInputElement;
            var select_mainToolbarAlign = document.querySelector("#select-mainToolbarAlign") as HTMLInputElement;

            switch_mainToolbarEnabled.checked = config.settings["layout"]["mainToolbarEnabled"]; //顯示工具列
            select_mainToolbarAlign.value = config.settings["layout"]["mainToolbarAlign"]; //工具列對齊

            switch_mainToolbarEnabled.addEventListener("change", () => { //顯示工具列
                let val = switch_mainToolbarEnabled.checked;
                config.settings["layout"]["mainToolbarEnabled"] = val;
                appleSettingOfMain();
            });

            select_mainToolbarAlign.addEventListener("change", () => { //工具列對齊
                let val = select_mainToolbarAlign.value;
                config.settings["layout"]["mainToolbarAlign"] = val;
                appleSettingOfMain();
            });
        })

        //檔案預覽視窗
        addLoadEvent(() => {
            var switch_fileListEnabled = document.querySelector("#switch-fileListEnabled") as HTMLInputElement;
            var switch_fileListShowNo = document.querySelector("#switch-fileListShowNo") as HTMLInputElement;
            var switch_fileListShowName = document.querySelector("#switch-fileListShowName") as HTMLInputElement;
            switch_fileListEnabled.checked = config.settings["layout"]["fileListEnabled"]; //啟用 檔案預覽視窗
            switch_fileListShowNo.checked = config.settings["layout"]["fileListShowNo"]; //顯示編號
            switch_fileListShowName.checked = config.settings["layout"]["fileListShowName"]; //顯示檔名

            switch_fileListEnabled.addEventListener("change", () => { //啟用 檔案預覽視窗
                let val = switch_fileListEnabled.checked;
                config.settings["layout"]["fileListEnabled"] = val;
                appleSettingOfMain();
            });
            switch_fileListShowNo.addEventListener("change", () => { //顯示編號
                let val = switch_fileListShowNo.checked;
                config.settings["layout"]["fileListShowNo"] = val;
                appleSettingOfMain();
            });
            switch_fileListShowName.addEventListener("change", () => { //顯示檔名
                let val = switch_fileListShowName.checked;
                config.settings["layout"]["fileListShowName"] = val;
                appleSettingOfMain();
            });
        })

        //資料夾預覽視窗
        addLoadEvent(() => {
            var switch_dirListEnabled = document.querySelector("#switch-dirListEnabled") as HTMLInputElement;
            var switch_dirListShowNo = document.querySelector("#switch-dirListShowNo") as HTMLInputElement;
            var switch_dirListShowName = document.querySelector("#switch-dirListShowName") as HTMLInputElement;
            var select_dirListImgNumber = document.querySelector("#select-dirListImgNumber") as HTMLInputElement;
            switch_dirListEnabled.checked = config.settings["layout"]["dirListEnabled"]; //啟用 資料夾預覽視窗
            switch_dirListShowNo.checked = config.settings["layout"]["dirListShowNo"]; //顯示編號
            switch_dirListShowName.checked = config.settings["layout"]["dirListShowName"]; //顯示檔名
            select_dirListImgNumber.value = config.settings["layout"]["dirListImgNumber"] + ""; //圖片數量

            switch_dirListEnabled.addEventListener("change", () => { //啟用 資料夾預覽視窗
                let val = switch_dirListEnabled.checked;
                config.settings["layout"]["dirListEnabled"] = val;
                appleSettingOfMain();
            });
            switch_dirListShowNo.addEventListener("change", () => { //顯示編號
                let val = switch_dirListShowNo.checked;
                config.settings["layout"]["dirListShowNo"] = val;
                appleSettingOfMain();
            });
            switch_dirListShowName.addEventListener("change", () => { //顯示檔名
                let val = switch_dirListShowName.checked;
                config.settings["layout"]["dirListShowName"] = val;
                appleSettingOfMain();
            });
            select_dirListImgNumber.addEventListener("change", () => { //圖片數量
                let val = Number(select_dirListImgNumber.value);
                config.settings["layout"]["dirListImgNumber"] = val;
                appleSettingOfMain();
            });
        })

        //詳細資料面板
        addLoadEvent(() => {
            //顯示 詳細資料面板
            var switch_mainExifEnabled = document.querySelector("#switch-mainExifEnabled") as HTMLInputElement;
            switch_mainExifEnabled.checked = config.settings["layout"]["mainExifEnabled"]; //
            switch_mainExifEnabled.addEventListener("change", () => {
                let val = switch_mainExifEnabled.checked;
                config.settings["layout"]["mainExifEnabled"] = val;
                appleSettingOfMain();
            });

            //寬度足夠時，橫向排列
            var switch_mainExifHorizontal = document.querySelector("#switch-mainExifHorizontal") as HTMLInputElement;
            switch_mainExifHorizontal.checked = config.settings["layout"]["mainExifHorizontal"]; //
            switch_mainExifHorizontal.addEventListener("change", () => {
                let val = switch_mainExifHorizontal.checked;
                config.settings["layout"]["mainExifHorizontal"] = val;
                appleSettingOfMain();
            });

            //顯示的最大行數(1~100)
            var text_mainExifMaxLine = document.querySelector("#text-mainExifMaxLine") as HTMLInputElement;
            text_mainExifMaxLine.value = config.settings["layout"]["mainExifMaxLine"] + "";
            text_mainExifMaxLine.addEventListener("change", () => {
                let val = Math.floor(Number(text_mainExifMaxLine.value));
                if (val > 1000) { val = 1000; }
                if (val <= 0) { val = 1; }
                text_mainExifMaxLine.value = val + "";
                config.settings["layout"]["mainExifMaxLine"] = val;
                appleSettingOfMain();
            });

        })

        //大型切換按鈕
        addLoadEvent(() => {
            //初始化設定
            Lib.setRadio("[name='largeBtn']", config.settings.layout.largeBtn);

            //變更時
            let domRadio = document.querySelector("#largeBtn-group") as HTMLElement;
            domRadio.addEventListener("change", () => { //
                let val = Lib.getRadio("[name='largeBtn']");
                config.settings.layout.largeBtn = val;
                appleSettingOfMain();
            });
        })

        // 圖片 dpi
        addLoadEvent(() => {
            var select_imageDpizoom = document.querySelector("#select-imageDpizoom") as HTMLInputElement;
            select_imageDpizoom.value = config.settings["image"]["dpizoom"];

            select_imageDpizoom.addEventListener("change", () => {
                let val = select_imageDpizoom.value;
                config.settings["image"]["dpizoom"] = val;
                appleSettingOfMain();
            });
        })

        // 縮小至特定比例以下，就使用libvips重新處理圖片
        addLoadEvent(() => {
            var select_tiefseeviewBigimgscaleRatio = document.querySelector("#select-tiefseeviewBigimgscaleRatio") as HTMLInputElement;
            select_tiefseeviewBigimgscaleRatio.value = config.settings["image"]["tiefseeviewBigimgscaleRatio"].toString();

            select_tiefseeviewBigimgscaleRatio.addEventListener("change", () => {
                let val = select_tiefseeviewBigimgscaleRatio.value;
                config.settings["image"]["tiefseeviewBigimgscaleRatio"] = Number(val);
                appleSettingOfMain();
            });
        })

        // 圖片 縮放模式
        addLoadEvent(() => {

            /*var select_tiefseeviewImageRendering = document.querySelector("#select-tiefseeviewImageRendering") as HTMLInputElement;
            select_tiefseeviewImageRendering.value = config.settings["image"]["tiefseeviewImageRendering"];

            select_tiefseeviewImageRendering.addEventListener("change", () => {
                let val = select_tiefseeviewImageRendering.value;
                config.settings["image"]["tiefseeviewImageRendering"] = val;
                appleSettingOfMain();
            });*/

            var switch_imageShowPixels = document.querySelector("#switch-imageShowPixels") as HTMLInputElement;
            switch_imageShowPixels.checked = config.settings["image"]["tiefseeviewImageRendering"] == "2"

            switch_imageShowPixels.addEventListener("change", () => {
                let val = switch_imageShowPixels.checked;
                if (val) {
                    config.settings["image"]["tiefseeviewImageRendering"] = "2";
                } else {
                    config.settings["image"]["tiefseeviewImageRendering"] = "0";
                }
                appleSettingOfMain();
            });
        })

        //相關路徑
        addLoadEvent(() => {
            var btn_openAppData = document.querySelector("#btn-openAppData") as HTMLElement;
            var btn_openWww = document.querySelector("#btn-openWww") as HTMLElement;
            var btn_openTemp = document.querySelector("#btn-openTemp") as HTMLElement;

            //開啟 AppData(使用者資料)
            btn_openAppData.addEventListener("click", async () => {
                let path = await WV_Window.GetAppDataPath();
                WV_RunApp.OpenUrl(path);
            });

            //開啟 www(原始碼)
            btn_openWww.addEventListener("click", async () => {
                let path = await WV_Window.GetAppDirPath();
                path = Lib.Combine([path, "www"]);
                WV_RunApp.OpenUrl(path);
            });

            //開啟 暫存資料夾
            btn_openTemp.addEventListener("click", async () => {
                let path = await WV_Path.GetTempPath();
                path = Lib.Combine([path, "Tiefsee"]);
                if (await WV_Directory.Exists(path) === false) { //如果不存在就新建
                    await WV_Directory.CreateDirectory(path);
                }
                WV_RunApp.OpenUrl(path);
            });
        })

        //清理暫存資料
        addLoadEvent(() => {
            var btn_clearBrowserCache = document.querySelector("#btn-clearBrowserCache") as HTMLElement;

            btn_clearBrowserCache.addEventListener("click", async () => {
                await WV_System.DeleteAllTemp(); //立即刪除所有圖片暫存
                await WV_Window.ClearBrowserCache(); //清理webview2的暫存
                msgbox.show({ txt: i18n.t("msg.tempDeleteCompleted") }); //暫存資料清理完成
            });
        })

        //資料夾數量太多時，禁用資料夾預覽視窗
        addLoadEvent(() => {
            var select_dirListMaxCount = document.querySelector("#select-dirListMaxCount") as HTMLInputElement;
            select_dirListMaxCount.value = config.settings["advanced"]["dirListMaxCount"] + "";

            select_dirListMaxCount.addEventListener("change", () => {
                let val = Number(select_dirListMaxCount.value);
                config.settings["advanced"]["dirListMaxCount"] = val;
                appleSettingOfMain();
            });
        })

        //圖片面積太大時，禁用高品質縮放
        addLoadEvent(() => {
            var select_highQualityLimit = document.querySelector("#select-highQualityLimit") as HTMLInputElement;
            select_highQualityLimit.value = config.settings["advanced"]["highQualityLimit"] + "";

            select_highQualityLimit.addEventListener("change", () => {
                let val = Number(select_highQualityLimit.value);
                config.settings["advanced"]["highQualityLimit"] = val;
                appleSettingOfMain();
            });
        })

        // 啟動模式 、 Port
        addLoadEvent(() => {

            var text_startPort = document.querySelector("#text-startPort") as HTMLInputElement;
            var text_serverCache = document.querySelector("#text-serverCache") as HTMLInputElement;
            var btn_restart = document.querySelector("#btn-startupMode-restart") as HTMLButtonElement;

            Lib.setRadio("[name='radio-startType']", appInfo.startType.toString())
            text_startPort.value = appInfo.startPort.toString();
            text_serverCache.value = appInfo.serverCache.toString();

            //調整選項後，顯示「重新啟動」的按鈕
            btn_restart.style.display = "none";
            $("[name='radio-startType']").on("change", () => {
                btn_restart.style.display = "";
            });

            //關閉視窗前觸發
            baseWindow.closingEvents.push(async () => {
                //儲存 start.ini
                let startPort = parseInt(text_startPort.value);
                let startType: any = Lib.getRadio("[name='radio-startType']");
                let serverCache = parseInt(text_serverCache.value);

                if (isNaN(startPort)) { startPort = 4876; }
                if (startPort > 65535) { startPort = 65535; }
                if (startPort < 1024) { startPort = 1024; }

                if (startType.search(/^[1|2|3|4|5]$/) !== 0) { startType = 2; }
                startType = parseInt(startType);

                if (isNaN(serverCache)) { serverCache = 0; }
                if (serverCache > 31536000) { serverCache = 31536000; }
                if (serverCache < 0) { serverCache = 0; }

                await WV_Window.SetStartIni(startPort, startType, serverCache);

            });

            //重新啟動Tiefsee
            btn_restart.addEventListener("click", async () => {
                restartTiefsee();
            })

        })

        //開機後自動啟動
        addLoadEvent(async () => {
            var switch_autoStart = document.querySelector("#switch-autoStart") as HTMLInputElement;

            let startupPath = await WV_Path.GetFolderPathStartup();
            let linkPath = Lib.Combine([startupPath, "Tiefsee.lnk"]);
            let isAutoStart = await WV_File.Exists(linkPath);
            switch_autoStart.checked = isAutoStart;


            async function newLnk() {
                let exePath = await WV_Window.GetAppPath();
                WV_System.NewLnk(exePath, linkPath, "none");
            }

            async function removeLnk() {
                WV_File.Delete(linkPath);
            }

            switch_autoStart.addEventListener("change", () => {
                let val = switch_autoStart.checked;
                if (val) {
                    newLnk();
                } else {
                    removeLnk();
                }
            });

            // 開啟Windows的「啟動資料夾
            var btn_openStartup = document.querySelector("#btn-openStartup") as HTMLElement;
            btn_openStartup.addEventListener("click", async () => {
                WV_RunApp.OpenUrl(startupPath);
            });
        })

        //擴充套件 
        addLoadEvent(() => {

            function getHtml(val: boolean) {
                if (val) {
                    return `<div class="pluginLiet-status color-success">Installed</div>`;
                } else {
                    return `<div class="pluginLiet-status color-warning">Not Installed</div>`;
                }
            }
            if (baseWindow.appInfo !== undefined) {

                //初始化 擴充套件清單
                var dom_QuickLook = document.querySelector("#pluginLiet-QuickLook") as HTMLInputElement;
                //var dom_NConvert = document.querySelector("#pluginLiet-NConvert") as HTMLInputElement;
                var dom_PDFTronWebviewer = document.querySelector("#pluginLiet-PDFTronWebviewer") as HTMLInputElement;
                var dom_MonacoEditor = document.querySelector("#pluginLiet-MonacoEditor") as HTMLInputElement;

                dom_QuickLook.innerHTML = getHtml(baseWindow.appInfo.plugin.QuickLook);
                //dom_NConvert.innerHTML = getHtml(baseWindow.appInfo.plugin.NConvert);
                dom_PDFTronWebviewer.innerHTML = getHtml(baseWindow.appInfo.plugin.PDFTronWebviewer);
                dom_MonacoEditor.innerHTML = getHtml(baseWindow.appInfo.plugin.MonacoEditor);

                //如果未安裝QuickLook擴充套件，就顯示提示文字，並且禁止編輯
                let dom_noInstalled = document.querySelector("#quickLook-noInstalled") as HTMLInputElement;
                let dom_box = document.querySelector("#quickLook-box") as HTMLInputElement;
                if (baseWindow.appInfo.plugin.QuickLook) {
                    dom_noInstalled.style.display = "none";
                    dom_box.style.opacity = "1";
                    dom_box.style.pointerEvents = "";
                } else {
                    dom_noInstalled.style.display = "block";
                    dom_box.style.opacity = "0.5";
                    dom_box.style.pointerEvents = "none";
                }
            }

            //開啟「Tiefsee Plugin」頁面
            document.querySelector("#btn-openPluginDownload")?.addEventListener("click", () => {
                WV_RunApp.OpenUrl("https://hbl917070.github.io/aeropic/plugin.html");
            });

            //開啟「Plugin」資料夾
            document.querySelector("#btn-openPluginDir")?.addEventListener("click", async () => {
                let path = await WV_Window.GetAppDataPath();
                path = Lib.Combine([path, "Plugin"]);
                if (await WV_Directory.Exists(path) === false) { //如果不存在就新建
                    await WV_Directory.CreateDirectory(path);
                }
                WV_RunApp.OpenUrl(path);
            });

            //重新啟動
            let btn_restart = document.querySelector("#btn-plugin-restart") as HTMLButtonElement;
            btn_restart.addEventListener("click", () => {
                restartTiefsee();
            });
        })

        //快速預覽
        addLoadEvent(() => {
            var switch_keyboardSpaceRun = document.querySelector("#switch-keyboardSpaceRun") as HTMLInputElement;
            var switch_mouseMiddleRun = document.querySelector("#switch-mouseMiddleRun") as HTMLInputElement;

            switch_keyboardSpaceRun.checked = config.settings.quickLook.keyboardSpaceRun;
            switch_mouseMiddleRun.checked = config.settings.quickLook.mouseMiddleRun;

            switch_keyboardSpaceRun.addEventListener("change", () => {
                let val = switch_keyboardSpaceRun.checked;
                config.settings.quickLook.keyboardSpaceRun = val;
                saveSetting();
            });

            switch_mouseMiddleRun.addEventListener("change", () => {
                let val = switch_mouseMiddleRun.checked;
                config.settings.quickLook.mouseMiddleRun = val;
                saveSetting();
            });
        })

        //其他
        addLoadEvent(() => {
            //檔案刪除前顯示確認視窗
            var switch_fileDeletingShowCheckMsg = document.querySelector("#switch-fileDeletingShowCheckMsg") as HTMLInputElement;
            switch_fileDeletingShowCheckMsg.checked = config.settings["other"]["fileDeletingShowCheckMsg"];

            switch_fileDeletingShowCheckMsg.addEventListener("change", () => {
                let val = switch_fileDeletingShowCheckMsg.checked;
                config.settings["other"]["fileDeletingShowCheckMsg"] = val;
                appleSettingOfMain();
            });
        })

        /** 
         * dom 交換順序
         */
        function swapDom(a: Element, b: Element) {
            if (a.parentNode === null || b.parentNode === null) { return; }
            if (a == b) { return }
            var aParent = a.parentNode;
            var bParent = b.parentNode;
            var aHolder = document.createElement("div");
            var bHolder = document.createElement("div");
            aParent.replaceChild(aHolder, a);
            bParent.replaceChild(bHolder, b);
            aParent.replaceChild(b, aHolder);
            bParent.replaceChild(a, bHolder);
        }


        /**
         * 將設定套用至 mainwiwndow
         */
        function appleSettingOfMain() {
            WV_Window.RunJsOfParent(`mainWindow.applySetting(${JSON.stringify(config.settings)})`);
        }


        /**
         * 儲存設定(關閉視窗時呼叫)
         */
        async function saveSetting() {

            appleSettingOfMain(); //將設定套用至 mainwiwndow

            //儲存 setting.json
            let s = JSON.stringify(config.settings, null, '\t');
            var path = await WV_Window.GetAppDataPath(); //程式的暫存資料夾
            path = Lib.Combine([path, "Setting.json"]);
            await WV_File.SetText(path, s);
        }


        /**
         * 重新啟動 Tiefsee
         */
        async function restartTiefsee() {

            //儲存ini、Setting.json
            let arFunc = baseWindow.closingEvents;
            for (let i = 0; i < arFunc.length; i++) {
                await arFunc[i]();
            }
            let imgPath = JSON.parse(await WV_Window.RunJsOfParent(`mainWindow.fileLoad.getFilePath()`)); //取得目前顯示的圖片
            if (imgPath === null) { imgPath = "" }
            imgPath = `"${imgPath}"`;
            let exePath = await WV_Window.GetAppPath();
            WV_RunApp.ProcessStart(exePath, imgPath, true, false);
            WV_Window.CloseAllWindow();
        }


    }
}


/**
 * 頁籤
 */
class Tabs {

    /**
     * 所有頁籤
     */
    public ar: { btn: HTMLElement | null, page: HTMLElement | null, func: () => void }[] = [];

    /**
     * 
     * @param btn 
     * @param page 
     * @param func 
     */
    private activeEvent(btn: HTMLElement | null, page: HTMLElement | null, func: () => void) {
        for (let i = 0; i < this.ar.length; i++) {
            const item = this.ar[i];
            item.btn?.setAttribute("active", "");
            item.page?.setAttribute("active", "");
        }
        btn?.setAttribute("active", "true");
        page?.setAttribute("active", "true");
        func();
    }

    /**
     * 顯示選擇的頁籤
     */
    public set(btn: HTMLElement | null) {
        for (let i = 0; i < this.ar.length; i++) {
            const item = this.ar[i];
            if (btn === item.btn) {
                this.activeEvent(btn, item.page, item.func)
            }
        }
    }

    /**
     * 新增頁籤(用於初始化)
     * @param btn 
     * @param page 
     * @param func 選中時觸發
     */
    public add(btn: HTMLElement | null, page: HTMLElement | null, func: () => void) {
        this.ar.push({ btn, page, func })
        btn?.addEventListener("click", () => {
            this.activeEvent(btn, page, func)
        })
    }

    constructor() { }
}
