import { useState, useEffect, useCallback } from 'react';
import rateService from '../services/rateService';

/**
 * Hook: useRates
 * Connects to the centralized RateService and provides reactive state.
 */
export function useRates() {
    const [todayRates, setTodayRates] = useState(rateService.todayRates);
    const [tomorrowRates, setTomorrowRates] = useState(rateService.tomorrowRates);
    const [previousRates, setPreviousRates] = useState(rateService.previousRates);
    const [hasTomorrowRate, setHasTomorrowRate] = useState(rateService.hasTomorrowRate);
    const [loading, setLoading] = useState(rateService.loading);
    const [historicalData, setHistoricalData] = useState(rateService.historicalData);

    useEffect(() => {
        // Start service if not started
        rateService.start();

        const unsubs = [
            rateService.on('ratesUpdated', (e) => {
                setTodayRates(e.detail.todayRates);
                setTomorrowRates(e.detail.tomorrowRates);
                setHasTomorrowRate(e.detail.hasTomorrowRate);
                setPreviousRates(e.detail.previousRates);
            }),
            rateService.on('loading', (e) => {
                setLoading(e.detail);
            }),
            rateService.on('historicalUpdated', (e) => {
                setHistoricalData(e.detail);
            }),
        ];

        // Emit initial state if already loaded
        if (!rateService.loading && rateService.todayRates.oficial > 0) {
            setTodayRates(rateService.todayRates);
            setTomorrowRates(rateService.tomorrowRates);
            setHasTomorrowRate(rateService.hasTomorrowRate);
            setLoading(false);
        }

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    const refresh = useCallback(() => {
        rateService.fetchLiveRates();
    }, []);

    const getRatesForDate = useCallback((dateStr) => {
        return rateService.getRatesForDate(dateStr);
    }, []);

    const getAvailableDates = useCallback(() => {
        return rateService.getAvailableDates();
    }, []);

    return {
        todayRates,
        tomorrowRates,
        previousRates,
        hasTomorrowRate,
        loading,
        historicalData,
        refresh,
        getRatesForDate,
        getAvailableDates,
    };
}

export default useRates;
