class Lib {

    /**
     * 取得資料夾路徑
     */
    public static GetDirectoryName = (path: string) => {
        path = path.replace(/[/]/ig, "\\");

        let count = path.split("\\").length - 1; //計算斜線數量

        /*if (path.lastIndexOf("\\") === path.length - 1) {
            path = path.substring(0, path.length - 1);
        }*/

        if (count === 0) { return null; } //沒有斜線表示沒有父親目錄
        if (path.length <= 2) { return null; }

        if (path.substring(0, 2) === "\\\\") { //網路路徑，例如 \\Desktop-abc\AA
            if (count <= 3) { //網路路徑至少要2層
                return null;
            }
            if (count === 4) {
                if (path.lastIndexOf("\\") === path.length - 1) { //斜線在最後 例如 \\Desktop-abc\AA\
                    return null;
                }
            }
        } else {
            if (count === 1) {
                if (path.lastIndexOf("\\") === path.length - 1) { //斜線在最後 例如 D:/
                    return null;
                }
            }
        }

        let name = path.substring(0, path.lastIndexOf("\\")); //取得資料夾路徑

        //避免 D:\ 變成 D:
        count = name.split("\\").length - 1; //計算斜線數量  
        if (count === 0) {
            name = name + "\\";
        }

        return name;
    }

    /**
     * 取得檔名。例如「abc.jpg」
     * @param path 
     * @returns 
     */
    public static GetFileName = (path: string) => {
        path = path.replace(/[/]/ig, "\\");
        let name = path.substring(path.lastIndexOf("\\") + 1); //取得檔名
        return name;
    }

    /**
     * 取得附檔名。例如「.jpg」(一律小寫)
     * @param path 
     * @returns 
     */
    public static GetExtension = (path: string) => {
        path = path.replace(/[/]/ig, "\\");
        let name = path.substring(path.lastIndexOf("\\") + 1); //取得檔名
        let index = name.lastIndexOf(".");
        if (index === -1) { return ""; }
        return "." + name.substring(index + 1).toLocaleLowerCase();
    }

    /**
     * 串接路徑
     * @param arPath 
     * @returns 
     */
    public static Combine = (arPath: string[]): string => {
        if (arPath.length === 0) { return ""; }
        if (arPath.length === 1) { return arPath[0]; }

        let sum = arPath[0];
        sum = sum.replace(/[\\]+$/, ""); //移除結尾斜線
        sum += "\\";

        for (let i = 1; i < arPath.length; i++) {
            let item = arPath[i];
            item = item.replace(/^([\\])+/, ""); //移除開頭斜線
            item = item.replace(/[\\]+$/, ""); //移除結尾斜線
            sum += item;
            if (i != arPath.length - 1) {
                sum += "\\";
            }
        }
        return sum;
    }

    /**
     * 註冊 double click 事件
     * @param dom 
     * @param func 
     * @param dealy 雙擊的時間(毫秒)
     */
    public static addEventDblclick(dom: HTMLElement, func: (e: MouseEvent) => void, dealy: number = 400) {

        var clickTimeout = -1;
        var _x = 0;
        var _y = 0;

        dom.addEventListener("mousedown", async (e: MouseEvent) => {

            if (e.button !== 0) { //如果不是滑鼠左鍵
                return;
            }

            if (clickTimeout !== -1) { //double click      
                clearTimeout(clickTimeout);
                clickTimeout = -1;
                if (Math.abs(_x - e.offsetX) < 4 && Math.abs(_y - e.offsetY) < 4) { //如果點擊位置一樣
                    func(e)
                }
            } else {
                _x = e.offsetX;
                _y = e.offsetY;
                clickTimeout = setTimeout(() => { //click
                    clickTimeout = -1;
                }, dealy);
            }
        });

    }

    /**
     * 判斷是否為動圖(gif、apng、webp動圖、svg)
     * @param fileInfo2 
     * @returns 
     */
    public static IsAnimation(fileInfo2: FileInfo2) {
        let hex = fileInfo2.HexValue;
        if (Lib.GetExtension(fileInfo2.Path) === ".svg") {
            return true;
        }
        if (hex.indexOf("47 49 46 38") === 0) { //gif
            return true;
        }
        if (hex.indexOf("89 50 4E 47 0D 0A 1A 0A") === 0) { //apng
            if (hex.indexOf("08 61 63 54") > 10) { //acTL
                return true;
            }
        }
        if (hex.indexOf("57 45 42 50 56 50 38 58 0A") > 0) { //WEBPVP8X 動圖
            return true;
        }
        return false;
    }

    /**
     * 取得真實檔案類型
     * @param fileInfo2 
     * @returns 小寫附檔名，例如「jpg」
     */
    public static GetFileType(fileInfo2: FileInfo2) {

        let fileExt = Lib.GetExtension(fileInfo2.Path); //取得附檔名
        fileExt = fileExt.replace(".", "").toLocaleLowerCase();

        let hex = fileInfo2.HexValue;
        if (hex.indexOf("FF D8 FF") === 0) {
            return "jpg";
        }
        if (hex.indexOf("42 4D") === 0 && hex.length > 30 && hex.substr(18, 11) === "00 00 00 00") {
            return "bmp";
        }
        if (hex.indexOf("47 49 46 38") === 0) { //GIF8
            return "gif";
        }
        if (hex.indexOf("89 50 4E 47 0D 0A 1A 0A") === 0) {
            if (hex.indexOf("08 61 63 54") > 10) { //acTL
                return "apng";
            } else {
                return "png";
            }
        }
        if (hex.indexOf("57 45 42 50 56 50 38 58 0A") > 0) { //WEBPVP8X 動圖
            return "webp";
        }
        if (hex.indexOf("57 45 42 50 56 50 38") > 0) { //WEBPVP8 靜態
            return "webp";
        }
        if (hex.indexOf("6D 69 6D 65 74 79 70 65 61 70 70 6C 69 63 61 74 69 6F 6E 2F 76 6E 64 2E 61 64 6F 62 65 2E 73 70 61 72 6B 6C 65 72 2E 70 72 6F 6A 65 63 74 2B 64 63 78 75 63 66 50 4B") > 0) {
            //mimetypeapplication/vnd.adobe.sparkler.projectdcxucfPK
            return "xd";
        }
        if (hex.indexOf("25 50 44 46") === 0) { // %PDF
            if (fileExt === "ai") { return "ai"; }
            return "pdf";
        }
        if (hex.indexOf("4C 00 00 00 01 14 02 00") === 0) {
            return "lnk";
        }

        if (hex.indexOf("66 74 79 70 69 73 6F") === 12) { //00() 00() 00() *(*) 66(f) 74(t) 79(y) 70(p) 69(i) 73(s) 6F(o)
            return "mp4";
        }
        if (hex.indexOf("66 74 79 70 6D 70 34") === 12) { //00() 00() 00() *(*) 66(f) 74(t) 79(y) 70(p) 6D(m) 70(p) 34(4)
            return "mp4";
        }
        if (hex.indexOf("66 74 79 70 6D 6D 70 34") === 12) { //00() 00() 00() 18(*) 66(f) 74(t) 79(y) 70(p) 6D(m) 6D(m) 70(p) 34(4)
            return "mp4";
        }
        if (hex.indexOf("66 74 79 70 4D 34 56") === 12) { //00() 00() 00() 28(() 66(f) 74(t) 79(y) 70(p) 4D(M) 34(4) 56(V)
            return "mp4";
        }
        if (hex.indexOf("66 74 79 70 61 76 69 66") === 12) { //00() 00() 00() *(*) 66(f) 74(t) 79(y) 70(p) 61(a) 76(v) 69(i) 66(f)
            return "avif";
        }
        /*if (hex.indexOf("66 74 79 70") === 12) { //00() 00() 00() *(*) 66(f) 74(t) 79(y) 70(p)
            return "mp4"; //可能將其他影片格式也誤判成mp4
        }*/


        if (hex.indexOf("1A 45 DF A3") === 0) { //可擴展二進位元語言
            if (hex.indexOf("77 65 62 6D 42 87") > 0) { //77(w) 65(e) 62(b) 6D(m) 42(B) 87()
                return "webm"
            }
        }
        if (hex.indexOf("4F 67 67 53") === 0) { //4F(O) 67(g) 67(g) 53(S)
            return "ogv";
        }

        if (hex.indexOf("38 42 50 53") === 0) { //38(8) 42(B) 50(P) 53(S)
            return "psd";
        }

        /*console.log("檔案類型辨識失敗: " + fileInfo2.Path);
        let sum = "";
        let sum2 = "";
        hex.split(" ").forEach(item => {
            sum += String.fromCharCode(parseInt(item, 16));
            sum2 += `${item}(${String.fromCharCode(parseInt(item, 16))}) `;
        });
        console.log(hex);
        console.log(sum2);
        console.log(sum);*/

        return fileExt;
    }

    /**
      * 取得檔案的大小的文字
      * @param path 
      * @returns 
      */
    public static getFileLength(len: number) {
        if (len / 1024 < 1) {
            return len.toFixed(1) + " B";
        } else if (len / (1024 * 1024) < 1) {
            return (len / (1024)).toFixed(1) + " KB";
        } else if (len / (1024 * 1024 * 1024) < 1) {
            return (len / (1024 * 1024)).toFixed(1) + " MB";
        }
        return (len / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    }

    /**
     * URL 轉 路徑
     */
    public static URLToPath(path: string): string {
        if (path.indexOf("file:///") === 0) { //一般檔案
            path = path.substring(8);
        } else if (path.indexOf("file://") === 0) { //網路路徑，例如 \\Desktop-abc\AA
            path = path.substring(5);
        }
        path = decodeURIComponent(path).replace(/[/]/g, "\\");
        return path;
    }

    /**
     * 路徑 轉 URL
     */
    public static pathToURL(path: string): string {
        return "file:///" + encodeURIComponent(path)
            .replace(/[%]3A/g, ":")
            .replace(/[%]2F/g, "/")
            .replace(/[%]5C/g, "/");
    }

    /**
     * 移除可能破壞html的跳脫符號
     */
    public static escape(htmlStr: string) {
        if (htmlStr === undefined || htmlStr === null) {
            return "";
        }
        return htmlStr.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** 
     * 取得整個頁面目前是否有選取文字
     */
    public static isTxtSelect() {
        let selection = window.getSelection();
        if (selection === null) { return false; }
        //let isElect = selection.anchorOffset !== selection.focusOffset;
        let isElect = selection.toString() !== "";
        return isElect;
    }

    /**
     * 取得目前的焦點是否在文字輸入框上
     */
    public static isTextFocused() {
        let dom = document.activeElement;
        if (dom === null) { return false; }
        let tag = dom.tagName;
        if (tag === "TEXTAREA") {
            return true;
        }
        if (tag === "INPUT" && dom.getAttribute("type") == "text") {
            return true;
        }
        return false;
    }

    /**
     * 判斷物件目前是否有捲動軸
     * @param type X | Y
     */
    public static isScrollbarVisible(element: HTMLElement, type = "Y") {
        if (type === "y" || type === "Y") {
            return element.scrollHeight > element.clientHeight;
        } else {
            return element.scrollWidth > element.clientWidth;
        }
    }

    /**
     * 從瀏覽器取得使用者當前使用的語言
     */
    public static getBrowserLang() {
        let browserLang = navigator.language.toLowerCase();
        if (browserLang == "zh" || browserLang.indexOf("zh-") === 0) {
            return "zh-TW";
        }
        if (browserLang.indexOf("ja") === 0) { //日本
            return "ja";
        }
        /*if (browserLang.indexOf("ko") === 0) { //韓文
            return "ko";
        }*/
        /*if (browserLang == "en" || browserLang.indexOf("en-") === 0) {
            return "en";
        }*/
        return "en";
    }

    /**
     * html字串 轉 dom物件
     * @param html 
     * @returns 
     */
    public static newDom(html: string): HTMLElement {
        var template = document.createElement("template");
        template.innerHTML = html.trim();
        return <HTMLElement>template.content.firstChild;
    }

    /**
     * 送出 GET 的http請求
     */
    public static async sendGet(type: ("text" | "json" | "base64"), url: string) {

        if (type === "text") {
            let txt = "";
            await fetch(url, {
                "method": "get",
            }).then((response) => {
                return response.text();
            }).then((html) => {
                txt = html;
            }).catch((err) => {
                console.log("error: ", err);
            });
            return txt;
        }

        if (type === "json") {
            let json: any = {};
            await fetch(url, {
                "method": "get",
            }).then((response) => {
                return response.json();
            }).then((html) => {
                json = html;
            }).catch((err) => {
                console.log("error: ", err);
            });
            return json;
        }

        if (type === "base64") {
            let base64: string = await new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        let d = reader.result;
                        if (typeof d === "string") {
                            resolve(d); //繼續往下執行
                        } else {
                            resolve(""); //繼續往下執行
                        }
                    }
                    reader.readAsDataURL(xhr.response);
                };
                xhr.open("GET", url);
                xhr.responseType = "blob";
                xhr.send();
            });
            return base64;
        }

    }

    /**
     * 等待
     * @param ms 毫秒
     */
    public static async sleep(ms: number) {
        await new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(0); //繼續往下執行
            }, ms);
        })
    }

    /**
     * 轉 number
     */
    public static toNumber(t: string | number): number {
        if (typeof (t) === "number") { return t } //如果本來就是數字，直接回傳     
        if (typeof t === "string") { return Number(t.replace("px", "")); } //如果是string，去掉px後轉型成數字
        return 0;
    }

    /**
     * 防抖 (持續接收到指令時不會執行，停止接收指令後的x毫秒，才會執行)
     */
    public static debounce(func: (...args: any[]) => void, delay = 250) {
        let timer: ReturnType<typeof setTimeout> | null = null;

        return function (this: any, ...args: any[]) {
            let context = this;

            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                func.apply(context, args);
            }, delay);
        }
    }

    /**
     * 取得 radio 值
     */
    public static getRadio(queryName: string): string {
        return $(`${queryName}:checked`).val() + "";
    }
    /**
     * 設定 radio 值
     * @param {*} queryName 例如 #rad 、 #aa [name='bb']
     * @param {*} value 
     */
    public static setRadio(queryName: string, value: string) {
        $(`${queryName}[value="${value}"]`).prop("checked", true); //radio 賦值
    }

}



/**
 * 對Date的擴充套件，將 Date 轉化為指定格式的String
 * 月(M)、日(d)、小時(h)、分(m)、秒(s)、季度(q) 可以用 1-2 個佔位符，
 * 年(y)可以用 1-4 個佔位符，毫秒(S)只能用 1 個佔位符(是 1-3 位的數字)
 * 例子：
 * (new Date()).format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
 * (new Date()).format("yyyy-M-d h:m:s.S")   ==> 2006-7-2 8:9:4.18
 */
Date.prototype.format = function (format: string) {
    var o: any = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    }

    if (/(y+)/.test(format)) format = format.replace(RegExp.$1,
        (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o) if (new RegExp("(" + k + ")").test(format))
        format = format.replace(RegExp.$1,
            RegExp.$1.length == 1 ? o[k] :
                ("00" + o[k]).substr(("" + o[k]).length));
    return format;
}
interface Date {
    format(format: string): string;
}


/**
 * 節流 (定時執行，時間內重複執行，則只會執行最後一個指令)
 */
class Throttle {
    public run = async () => { };
    public timeout = 50;

    constructor(_timeout = 50) {
        this.timeout = _timeout;
        this.timer();
    }

    private async timer() {
        let _func = this.run;
        this.run = async () => { };
        await _func();
        setTimeout(() => {
            this.timer(); //遞迴
        }, this.timeout);
    }
}