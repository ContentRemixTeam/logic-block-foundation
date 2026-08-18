export function useMastermindSuccessPath() {
  return {
    isLoading: false,
    error: null,
    data: {
      selectedStageId: 'sell',
      snapshot: {
        current_milestone_title: 'Run the complete sales cycle',
        capacity_mode: 'standard',
      },
      cycle: {
        goal: 'Finish a simple sales page and invite the right buyers',
        focus_area: 'Selling',
        biggest_bottleneck: 'The sales page is unclear',
        low_energy_version: 'Write only the first section today',
      },
    },
  };
}
