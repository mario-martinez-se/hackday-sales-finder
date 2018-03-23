function init(myViewModel) {
    if (myViewModel.city) {
      $.ajax({
        type: "GET",
        url: `sales?query=${myViewModel.city}`,
        success: data => data.match.length > 0 ? myViewModel.cityResults(data.match) : myViewModel.noResultsForCity(true),
        error: () => myViewModel.noResultsForCity(true)
      });
    }
    
    if (myViewModel.country) {
      $.ajax({
        type: "GET",
        url: `sales?query=${myViewModel.country}`,
        success: data => data.match.length > 0 ? myViewModel.countryResults(data.match) : myViewModel.noResultsForCountry(true),
        error: () => myViewModel.noResultsForCountry(true)
      });
    }
    
}