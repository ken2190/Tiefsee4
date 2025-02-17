﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Tiefsee {
    public static class Adapter {
        public static SynchronizationContext Dispacher { get; private set; }
        public static bool isRuning = true; //用於判斷程式是否還在運行

        /// <summary>
        /// 請於UI執行緒呼叫此方法。
        /// </summary>
        public static void Initialize() {
            if (Adapter.Dispacher == null)
                Adapter.Dispacher = SynchronizationContext.Current;
        }

        /// <summary>
        /// 程式離開時呼叫
        /// </summary>
        public static void Shutdown() {
            isRuning = false;
        }

        /// <summary>
        /// 在 Dispatcher 關聯的執行緒上以同步方式執行指定的委派。
        /// </summary>
        public static void Invoke(SendOrPostCallback d, object state) {
            Dispacher.Send(d, state);
        }
        /// <summary>
        /// 在 Dispatcher 關聯的執行緒上以非同步方式執行指定的委派。
        /// </summary>
        public static void BeginInvoke(SendOrPostCallback d, object state) {
            Dispacher.Post(d, state);
        }

        /// <summary>
        /// 在UI執行緒執行
        /// </summary>
        /// <param name="ac"></param>
        public static void UIThread(Action ac) {
            Adapter.Invoke(new SendOrPostCallback(obj => { // 呼叫UI執行緒
                ac();
            }), null);
        }

        /// <summary>
        /// 延遲執行
        /// </summary>
        /// <param name="interval"></param>
        /// <param name="func"></param>
        /// <param name="isAsync"></param>
        public static void DelayRun(int interval, Action func, bool isAsync = false) {
            new Thread(() => {
                ThreadSleep(interval);
                if (isAsync) {
                    func();
                } else {
                    UIThread(func);
                }
            }).Start();
        }

        /// <summary>
        /// 循環執行
        /// </summary>
        /// <param name="interval"></param>
        /// <param name="func"></param>
        /// <param name="isAsync"></param>
        public static void LoopRun(int interval, Action func, bool isAsync = false) {
            new Thread(() => {
                while (isRuning) {
                    if (isAsync) {
                        func();
                    } else {
                        UIThread(func);
                    }
                    ThreadSleep(interval);
                }
            }).Start();
        }

        /// <summary>
        /// 等同於 Thread.Sleep()，但程式結束後會立即停止睡眠
        /// </summary>
        /// <param name="interval"></param>
        private static void ThreadSleep(int interval) {

            int x = interval;

            while (isRuning) { //每100毫秒檢查一次程式是否還在運行
                if (x > 100) {
                    Thread.Sleep(100);
                } else {
                    Thread.Sleep(x);
                    return;
                }
                x -= 100;
            }

        }


    }
}
