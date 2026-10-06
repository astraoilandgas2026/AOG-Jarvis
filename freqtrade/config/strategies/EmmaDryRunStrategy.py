from freqtrade.strategy import IStrategy
from pandas import DataFrame

class EmmaDryRunStrategy(IStrategy):
    INTERFACE_VERSION = 3
    timeframe = "5m"
    can_short = False
    minimal_roi = {"0": 0.02}
    stoploss = -0.01
    process_only_new_candles = True

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe["ema20"] = dataframe["close"].ewm(span=20, adjust=False).mean()
        dataframe["ema50"] = dataframe["close"].ewm(span=50, adjust=False).mean()
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[(dataframe["ema20"] > dataframe["ema50"]) & (dataframe["ema20"].shift(1) <= dataframe["ema50"].shift(1)) & (dataframe["volume"] > 0), "enter_long"] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[(dataframe["ema20"] < dataframe["ema50"]) & (dataframe["ema20"].shift(1) >= dataframe["ema50"].shift(1)) & (dataframe["volume"] > 0), "exit_long"] = 1
        return dataframe
